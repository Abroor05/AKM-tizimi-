// ============================================================
// SPECIAL ROUTES - Users, Reports, Tasks, Notifications, Settings, Dashboard, Audit
// ============================================================
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { getAll, getById, insertRow, updateRow, deleteRow, getSetting, setSetting, rowToObject } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addAuditLog(userId, action, module, details, req) {
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  insertRow('audit_log', {
    id: logId,
    user_id: userId,
    action,
    module,
    details,
    ip_address: req?.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// USERS ROUTER
// ============================================================
const usersRouter = Router();

function canManageUserScope(currentUser, targetUser = null, targetRole = null, targetViloyatId = null, targetTumanId = null) {
  if (!currentUser) return false;

  if (currentUser.role === 'super_admin') return true;

  const role = targetRole || targetUser?.role || null;
  const allowedRoles = ['kutubxona_xodimi'];

  if (currentUser.role === 'viloyat_admin') {
    if (!allowedRoles.includes(role)) return false;
    return targetViloyatId === currentUser.viloyatId || targetUser?.viloyatId === currentUser.viloyatId;
  }

  if (currentUser.role === 'tuman_admin') {
    if (!allowedRoles.includes(role)) return false;
    const sameViloyat = (targetViloyatId || targetUser?.viloyatId) === currentUser.viloyatId;
    const sameTuman = (targetTumanId || targetUser?.tumanId) === currentUser.tumanId;
    return sameViloyat && sameTuman;
  }

  return false;
}

usersRouter.get('/', authMiddleware, (req, res) => {
  const users = getAll('users');
  // Strip password_hash from response
  res.json(users.map(u => {
    const { password_hash, ...safe } = u;
    return safe;
  }));
});

usersRouter.get('/:id', authMiddleware, (req, res) => {
  const user = getById('users', req.params.id);
  if (!user) return res.status(404).json({ error: 'Topilmadi' });
  const { password_hash, ...safe } = user;
  res.json(safe);
});

usersRouter.post('/', authMiddleware, (req, res) => {
  const { username, password, fullName, role, phone, email, viloyatId, tumanId, libraryId } = req.body;
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmadi' });
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  if (normalizedEmail) {
    const duplicateEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
    if (duplicateEmail) {
      return res.status(409).json({ error: 'Bu email allaqachon ishlatilgan' });
    }
  }

  if (req.user.role !== 'super_admin' && req.user.role !== 'viloyat_admin' && req.user.role !== 'tuman_admin') {
    return res.status(403).json({ error: 'Siz foydalanuvchi yaratish uchun ruxsatga ega emassiz' });
  }

  if (req.user.role !== 'super_admin') {
    if (role !== 'kutubxona_xodimi') {
      return res.status(403).json({ error: 'Faqat super admin boshqa admin rolini yaratishi mumkin' });
    }
    if ((viloyatId || req.user.viloyatId) !== req.user.viloyatId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni kiritishingiz mumkin' });
    }
    if (req.user.role === 'tuman_admin' && (tumanId || req.user.tumanId) !== req.user.tumanId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni kiritishingiz mumkin' });
    }
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) return res.status(409).json({ error: 'Bu login allaqachon mavjud' });

  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const todayStr = new Date().toISOString().split('T')[0];
  db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, phone, email, viloyat_id, tuman_id, library_id, active, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
    .run(id, username.trim(), passwordHash, fullName, phone || null, normalizedEmail || null, viloyatId || null, tumanId || null, libraryId || null, todayStr, null);

  addAuditLog(req.user.id, 'create', 'users', `Yangi foydalanuvchi: ${username}`, req);
  const user = getById('users', id);
  const { password_hash, ...safe } = user;
  res.status(201).json(safe);
});

usersRouter.put('/:id', authMiddleware, (req, res) => {
  const existing = getById('users', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });

  const incomingEmail = ((req.body.email || existing.email || '') + '').trim().toLowerCase();
  if (incomingEmail) {
    const duplicateEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(incomingEmail, req.params.id);
    if (duplicateEmail) {
      return res.status(409).json({ error: 'Bu email allaqachon ishlatilgan' });
    }
  }

  if (req.user.role !== 'super_admin') {
    const targetRole = req.body.role || existing.role;
    if (targetRole !== 'kutubxona_xodimi') {
      return res.status(403).json({ error: 'Faqat super admin boshqa admin rolini o\'zgartira oladi' });
    }
    if ((req.body.viloyatId || existing.viloyatId) !== req.user.viloyatId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni yangilay olasiz' });
    }
    if (req.user.role === 'tuman_admin' && (req.body.tumanId || existing.tumanId) !== req.user.tumanId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni yangilay olasiz' });
    }
  }

  const updates = { ...req.body };
  if (updates.email) updates.email = updates.email.trim().toLowerCase();
  // Never update password_hash via PUT
  delete updates.password_hash;
  delete updates.password;
  const updated = updateRow('users', req.params.id, updates);
  addAuditLog(req.user.id, 'update', 'users', `Foydalanuvchi yangilandi: ${req.params.id}`, req);
  const { password_hash, ...safe } = updated;
  res.json(safe);
});

usersRouter.patch('/:id', authMiddleware, (req, res) => {
  const existing = getById('users', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });

  if (req.user.role !== 'super_admin') {
    const targetRole = req.body.role || existing.role;
    if (targetRole !== 'kutubxona_xodimi') {
      return res.status(403).json({ error: 'Faqat super admin boshqa admin rolini o\'zgartira oladi' });
    }
    if ((req.body.viloyatId || existing.viloyatId) !== req.user.viloyatId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni yangilay olasiz' });
    }
    if (req.user.role === 'tuman_admin' && (req.body.tumanId || existing.tumanId) !== req.user.tumanId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni yangilay olasiz' });
    }
  }

  const updates = { ...req.body };
  if (updates.email) updates.email = updates.email.trim().toLowerCase();
  delete updates.password_hash;
  delete updates.password;
  const updated = updateRow('users', req.params.id, updates);
  const { password_hash, ...safe } = updated;
  res.json(safe);
});

usersRouter.delete('/:id', authMiddleware, (req, res) => {
  const existing = getById('users', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });

  if (req.user.role !== 'super_admin') {
    if (existing.role !== 'kutubxona_xodimi') {
      return res.status(403).json({ error: 'Faqat super admin boshqa adminlarni o\'chirishi mumkin' });
    }
    if (existing.viloyatId !== req.user.viloyatId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni o\'chira olasiz' });
    }
    if (req.user.role === 'tuman_admin' && existing.tumanId !== req.user.tumanId) {
      return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni o\'chira olasiz' });
    }
  }

  const success = deleteRow('users', req.params.id);
  if (!success) return res.status(404).json({ error: 'Topilmadi' });
  addAuditLog(req.user.id, 'delete', 'users', `Foydalanuvchi o'chirildi: ${req.params.id}`, req);
  res.json({ success: true });
});

// Reset password
usersRouter.post('/:id/reset-password', authMiddleware, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Yangi parol talab qilinadi' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  addAuditLog(req.user.id, 'reset_password', 'users', `Parol tiklandi: ${req.params.id}`, req);
  res.json({ success: true });
});

// ============================================================
// REPORTS ROUTER
// ============================================================
const reportsRouter = Router();

reportsRouter.get('/', authMiddleware, (req, res) => {
  res.json(getAll('reports'));
});

reportsRouter.get('/:id', authMiddleware, (req, res) => {
  const report = getById('reports', req.params.id);
  if (!report) return res.status(404).json({ error: 'Topilmadi' });
  res.json(report);
});

reportsRouter.post('/', authMiddleware, (req, res) => {
  const body = req.body;
  const id = body.id || generateId('rep');
  const todayStr = new Date().toISOString().split('T')[0];
  const obj = {
    id,
    type: body.type || 'monthly',
    title: body.title || '',
    library_id: body.libraryId || req.user.library_id || null,
    user_id: req.user.id,
    viloyat_id: body.viloyatId || req.user.viloyat_id || null,
    tuman_id: body.tumanId || req.user.tuman_id || null,
    status: body.status || 'draft',
    period: body.period || todayStr.slice(0, 7),
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    review_comment: null,
    data: JSON.stringify(body.data || {}),
    description: body.description || '',
    created_at: new Date().toISOString(),
  };
  const keys = Object.keys(obj);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => obj[k]);
  db.prepare(`INSERT INTO reports (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  addAuditLog(req.user.id, 'create', 'reports', `Yangi hisobot: ${obj.title}`, req);
  res.status(201).json(getById('reports', id));
});

reportsRouter.put('/:id', authMiddleware, (req, res) => {
  const existing = getById('reports', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  const body = { ...req.body };
  if (body.data && typeof body.data === 'object') body.data = JSON.stringify(body.data);
  const updated = updateRow('reports', req.params.id, body);
  res.json(updated);
});

reportsRouter.patch('/:id', authMiddleware, (req, res) => {
  const existing = getById('reports', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  const body = { ...req.body };
  if (body.data && typeof body.data === 'object') body.data = JSON.stringify(body.data);
  res.json(updateRow('reports', req.params.id, body));
});

reportsRouter.delete('/:id', authMiddleware, (req, res) => {
  deleteRow('reports', req.params.id);
  res.json({ success: true });
});

// Submit report
reportsRouter.post('/:id/submit', authMiddleware, (req, res) => {
  const existing = getById('reports', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  const todayStr = new Date().toISOString().split('T')[0];
  const updated = updateRow('reports', req.params.id, { status: 'submitted', submitted_at: todayStr });
  addAuditLog(req.user.id, 'submit', 'reports', `Hisobot yuborildi: ${req.params.id}`, req);
  res.json(updated);
});

// Review report (approve/reject)
reportsRouter.post('/:id/review', authMiddleware, (req, res) => {
  const { action, comment } = req.body;
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action: approve yoki reject' });
  }
  const existing = getById('reports', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  const status = action === 'approve' ? 'approved' : 'rejected';
  const todayStr = new Date().toISOString().split('T')[0];
  const updated = updateRow('reports', req.params.id, {
    status,
    reviewed_at: todayStr,
    reviewed_by: req.user.id,
    review_comment: comment || null,
  });
  addAuditLog(req.user.id, action, 'reports', `Hisobot ${action}: ${req.params.id}`, req);
  res.json(updated);
});

// ============================================================
// TASKS ROUTER
// ============================================================
const tasksRouter = Router();

tasksRouter.get('/', authMiddleware, (req, res) => {
  res.json(getAll('tasks'));
});

tasksRouter.get('/:id', authMiddleware, (req, res) => {
  const task = getById('tasks', req.params.id);
  if (!task) return res.status(404).json({ error: 'Topilmadi' });
  res.json(task);
});

tasksRouter.post('/', authMiddleware, (req, res) => {
  const body = req.body;
  const id = body.id || generateId('task');
  const todayStr = new Date().toISOString().split('T')[0];
  const obj = {
    id,
    title: body.title || '',
    description: body.description || '',
    assigned_by: req.user.id,
    assigned_to: body.assignedTo || null,
    library_id: body.libraryId || req.user.library_id || null,
    priority: body.priority || 'medium',
    status: body.status || 'pending',
    due_date: body.dueDate || null,
    created_at: todayStr,
    completed_at: null,
  };
  const keys = Object.keys(obj);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => obj[k]);
  db.prepare(`INSERT INTO tasks (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  addAuditLog(req.user.id, 'create', 'tasks', `Yangi topshiriq: ${obj.title}`, req);
  res.status(201).json(getById('tasks', id));
});

tasksRouter.put('/:id', authMiddleware, (req, res) => {
  const existing = getById('tasks', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  const updated = updateRow('tasks', req.params.id, req.body);
  res.json(updated);
});

tasksRouter.patch('/:id', authMiddleware, (req, res) => {
  const existing = getById('tasks', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  res.json(updateRow('tasks', req.params.id, req.body));
});

tasksRouter.delete('/:id', authMiddleware, (req, res) => {
  deleteRow('tasks', req.params.id);
  res.json({ success: true });
});

// Update task status
tasksRouter.post('/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status talab qilinadi' });
  const existing = getById('tasks', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });
  const updates = { status };
  if (status === 'completed') updates.completed_at = new Date().toISOString().split('T')[0];
  const updated = updateRow('tasks', req.params.id, updates);
  addAuditLog(req.user.id, 'update_status', 'tasks', `Topshiriq holati: ${req.params.id} -> ${status}`, req);
  res.json(updated);
});

// ============================================================
// NOTIFICATIONS ROUTER
// ============================================================
const notificationsRouter = Router();

notificationsRouter.get('/', authMiddleware, (req, res) => {
  // Return notifications for current user
  const all = getAll('notifications');
  const mine = all.filter(n => n.targetUserId === req.user.id || n.targetRole === req.user.role);
  res.json(mine);
});

notificationsRouter.get('/unread-count', authMiddleware, (req, res) => {
  const all = getAll('notifications');
  const mine = all.filter(n => (n.targetUserId === req.user.id || n.targetRole === req.user.role) && !n.read);
  res.json({ count: mine.length });
});

notificationsRouter.post('/:id/read', authMiddleware, (req, res) => {
  updateRow('notifications', req.params.id, { read: 1 });
  res.json({ success: true });
});

notificationsRouter.post('/read-all', authMiddleware, (req, res) => {
  const all = getAll('notifications');
  for (const n of all) {
    if (n.targetUserId === req.user.id || n.targetRole === req.user.role) {
      if (!n.read) updateRow('notifications', n.id, { read: 1 });
    }
  }
  res.json({ success: true });
});

notificationsRouter.post('/', authMiddleware, (req, res) => {
  const body = req.body;
  const id = body.id || generateId('n');
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const obj = {
    id,
    type: body.type || 'info',
    title: body.title || '',
    message: body.message || '',
    target_role: body.targetRole || null,
    target_user_id: body.targetUserId || null,
    date: body.date || todayStr,
    time: body.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    read: 0,
  };
  const keys = Object.keys(obj);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => obj[k]);
  db.prepare(`INSERT INTO notifications (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  res.status(201).json(getById('notifications', id));
});

notificationsRouter.delete('/:id', authMiddleware, (req, res) => {
  deleteRow('notifications', req.params.id);
  res.json({ success: true });
});

// ============================================================
// SETTINGS ROUTER
// ============================================================
const settingsRouter = Router();

settingsRouter.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  res.json(settings);
});

settingsRouter.put('/', authMiddleware, (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    setSetting(key, value);
  }
  addAuditLog(req.user.id, 'update', 'settings', 'Tizim sozlamalari yangilandi', req);
  res.json({ success: true });
});

// ============================================================
// AUDIT LOG ROUTER
// ============================================================
const auditRouter = Router();

auditRouter.get('/', authMiddleware, (req, res) => {
  const logs = getAll('audit_log');
  res.json(logs);
});

auditRouter.post('/', authMiddleware, (req, res) => {
  const { action, module, details } = req.body;
  const id = generateId('log');
  insertRow('audit_log', {
    id,
    user_id: req.user.id,
    action: action || 'unknown',
    module: module || 'unknown',
    details: details || '',
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });
  res.status(201).json(getById('audit_log', id));
});

// ============================================================
// DASHBOARD ROUTER - Aggregate statistics
// ============================================================
const dashboardRouter = Router();

dashboardRouter.get('/stats', authMiddleware, (req, res) => {
  const stats = {
    totalLibraries: db.prepare('SELECT COUNT(*) as c FROM libraries').get().c,
    totalBooks: db.prepare('SELECT COUNT(*) as c FROM books').get().c,
    totalReaders: db.prepare('SELECT COUNT(*) as c FROM readers').get().c,
    totalActivities: db.prepare('SELECT COUNT(*) as c FROM activities').get().c,
    totalReports: db.prepare('SELECT COUNT(*) as c FROM reports').get().c,
    pendingReports: db.prepare("SELECT COUNT(*) as c FROM reports WHERE status IN ('draft','submitted','under_review')").get().c,
    totalTasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
    pendingTasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status IN ('pending','in_progress')").get().c,
    totalEvents: db.prepare('SELECT COUNT(*) as c FROM events').get().c,
    upcomingEvents: db.prepare("SELECT COUNT(*) as c FROM events WHERE status = 'upcoming'").get().c,
    totalInventory: db.prepare('SELECT COUNT(*) as c FROM inventory').get().c,
    totalAppeals: db.prepare('SELECT COUNT(*) as c FROM appeals').get().c,
    newAppeals: db.prepare("SELECT COUNT(*) as c FROM appeals WHERE status = 'new'").get().c,
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    // Charts data
    booksByCategory: db.prepare("SELECT category, COUNT(*) as count FROM books GROUP BY category").all(),
    readersByStatus: db.prepare("SELECT status, COUNT(*) as count FROM readers GROUP BY status").all(),
    reportsByStatus: db.prepare("SELECT status, COUNT(*) as count FROM reports GROUP BY status").all(),
    tasksByStatus: db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").all(),
    // Library-level data
    booksByLibrary: db.prepare("SELECT library_id, COUNT(*) as count FROM books GROUP BY library_id").all(),
    readersByLibrary: db.prepare("SELECT library_id, COUNT(*) as count FROM readers GROUP BY library_id").all(),
  };

  // Unread notifications for current user
  const notifs = getAll('notifications');
  stats.unreadNotifications = notifs.filter(n =>
    (n.targetUserId === req.user.id || n.targetRole === req.user.role) && !n.read
  ).length;

  res.json(stats);
});

// ============================================================
// EXPORT
// ============================================================
export function mountSpecialRoutes(app) {
  app.use('/api/users', usersRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/audit-log', auditRouter);
  app.use('/api/dashboard', dashboardRouter);
}
