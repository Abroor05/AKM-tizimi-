// ============================================================
// SPECIAL ROUTES - Users, Reports, Tasks, Notifications, Settings, Dashboard, Audit (PostgreSQL)
// ============================================================
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  getAll,
  getById,
  insertRow,
  updateRow,
  deleteRow,
  getSetting,
  setSetting,
  query,
} from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveLibraryIdForRole({ role, libraryId, viloyatId, tumanId }, currentUser = null) {
  const libraryRoles = ['kutubxona_xodimi', 'xodimlar_boshligi'];
  if (!libraryRoles.includes(role)) return libraryId || null;

  const chosen = libraryId || currentUser?.libraryId || currentUser?.library_id || null;
  if (chosen) return chosen;

  const finalViloyatId = viloyatId || currentUser?.viloyatId || currentUser?.viloyat_id || null;
  const finalTumanId = tumanId || currentUser?.tumanId || currentUser?.tuman_id || null;
  if (!finalViloyatId || !finalTumanId) return null;

  const res = await query(
    'SELECT id FROM libraries WHERE viloyat_id = ? AND tuman_id = ? ORDER BY created_at DESC, name ASC LIMIT 1',
    [finalViloyatId, finalTumanId]
  );
  let library = res.rows[0];

  if (!library) {
    const newLibraryId = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const label = finalTumanId ? `Kutubxona (${finalTumanId})` : 'Asosiy kutubxona';
    await query(
      'INSERT INTO libraries (id, name, type, viloyat_id, tuman_id, address, phone, email, staff_count, founding_year, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)',
      [newLibraryId, label, 'district', finalViloyatId, finalTumanId, '', '', '', new Date().getFullYear(), 'active', new Date().toISOString()]
    );
    library = { id: newLibraryId };
  }

  return library?.id || null;
}

async function addAuditLog(userId, action, module, details, req) {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await insertRow('audit_log', {
      id: logId,
      user_id: userId,
      action,
      module,
      details,
      ip_address: req?.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log saqlashda xatolik:', err.message);
  }
}

// ============================================================
// USERS ROUTER
// ============================================================
const usersRouter = Router();

usersRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const users = await getAll('users');
    res.json(
      users.map((u) => {
        const { password_hash, ...safe } = u;
        return safe;
      })
    );
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const user = await getById('users', req.params.id);
    if (!user) return res.status(404).json({ error: 'Topilmadi' });
    const { password_hash, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { username, password, fullName, role, phone, email, viloyatId, tumanId, libraryId } = req.body;
    const passwordValue = (password || '').trim();
    if (!username || !fullName || !role) {
      return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmadi' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      const duplicateRes = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
      if (duplicateRes.rows.length > 0) {
        return res.status(409).json({ error: 'Bu email allaqachon ishlatilgan' });
      }
    }

    if (
      req.user.role !== 'super_admin' &&
      req.user.role !== 'viloyat_admin' &&
      req.user.role !== 'tuman_admin' &&
      req.user.role !== 'xodimlar_boshligi'
    ) {
      return res.status(403).json({ error: 'Siz foydalanuvchi yaratish uchun ruxsatga ega emassiz' });
    }

    if (req.user.role !== 'super_admin') {
      if (role !== 'kutubxona_xodimi' && role !== 'xodimlar_boshligi') {
        return res.status(403).json({ error: 'Faqat super admin boshqa admin rolini yaratishi mumkin' });
      }
      if ((viloyatId || req.user.viloyatId) !== req.user.viloyatId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni kiritishingiz mumkin' });
      }
      if (req.user.role === 'tuman_admin' && (tumanId || req.user.tumanId) !== req.user.tumanId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni kiritishingiz mumkin' });
      }
      if (req.user.role === 'xodimlar_boshligi') {
        if (role !== 'kutubxona_xodimi') {
          return res.status(403).json({ error: 'Xodimlar boshligi faqat kutubxona xodimi yaratishi mumkin' });
        }
        if ((libraryId || req.user.libraryId) !== req.user.libraryId) {
          return res.status(403).json({ error: 'Siz faqat o\'zingizning kutubxonangizga xodim qo\'sha olasiz' });
        }
      }
    }

    const existsRes = await query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'Bu login allaqachon mavjud' });

    const effectiveLibraryId = await resolveLibraryIdForRole({ role, libraryId, viloyatId, tumanId }, req.user);
    const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const passwordHash = bcrypt.hashSync(passwordValue || '', 10);
    const todayStr = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO users (id, username, password_hash, full_name, role, phone, email, viloyat_id, tuman_id, library_id, active, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username.trim(),
        passwordHash,
        fullName,
        role,
        phone || null,
        normalizedEmail || null,
        viloyatId || null,
        tumanId || null,
        effectiveLibraryId || null,
        1,
        todayStr,
        null,
      ]
    );

    await addAuditLog(req.user.id, 'create', 'users', `Yangi foydalanuvchi: ${username}`, req);
    const user = await getById('users', id);
    const { password_hash, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    next(err);
  }
});

usersRouter.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });

    const incomingEmail = ((req.body.email || existing.email || '') + '').trim().toLowerCase();
    if (incomingEmail) {
      const duplicateRes = await query('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [incomingEmail, req.params.id]);
      if (duplicateRes.rows.length > 0) {
        return res.status(409).json({ error: 'Bu email allaqachon ishlatilgan' });
      }
    }

    if (req.user.role !== 'super_admin') {
      const targetRole = req.body.role || existing.role;
      if (targetRole !== 'kutubxona_xodimi' && targetRole !== 'xodimlar_boshligi') {
        return res.status(403).json({ error: 'Faqat super admin boshqa admin rolini o\'zgartira oladi' });
      }
      if ((req.body.viloyatId || existing.viloyatId) !== req.user.viloyatId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni yangilay olasiz' });
      }
      if (req.user.role === 'tuman_admin' && (req.body.tumanId || existing.tumanId) !== req.user.tumanId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni yangilay olasiz' });
      }
      if (req.user.role === 'xodimlar_boshligi' && (existing.libraryId || existing.library_id) !== req.user.libraryId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning kutubxonangiz xodimlarini yangilay olasiz' });
      }
    }

    const updates = { ...req.body };
    if (updates.email) updates.email = updates.email.trim().toLowerCase();
    if ((updates.role === 'kutubxona_xodimi' || updates.role === 'xodimlar_boshligi') && !updates.libraryId && !updates.library_id) {
      updates.libraryId = await resolveLibraryIdForRole(
        {
          role: updates.role,
          libraryId: updates.libraryId,
          viloyatId: updates.viloyatId || existing.viloyatId,
          tumanId: updates.tumanId || existing.tumanId,
        },
        req.user
      );
    }
    delete updates.password_hash;
    delete updates.password;

    const updated = await updateRow('users', req.params.id, updates);
    await addAuditLog(req.user.id, 'update', 'users', `Foydalanuvchi yangilandi: ${req.params.id}`, req);
    const { password_hash, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });

    if (req.user.role !== 'super_admin') {
      const targetRole = req.body.role || existing.role;
      if (targetRole !== 'kutubxona_xodimi' && targetRole !== 'xodimlar_boshligi') {
        return res.status(403).json({ error: 'Faqat super admin boshqa admin rolini o\'zgartira oladi' });
      }
      if ((req.body.viloyatId || existing.viloyatId) !== req.user.viloyatId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni yangilay olasiz' });
      }
      if (req.user.role === 'tuman_admin' && (req.body.tumanId || existing.tumanId) !== req.user.tumanId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni yangilay olasiz' });
      }
      if (req.user.role === 'xodimlar_boshligi' && (existing.libraryId || existing.library_id) !== req.user.libraryId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning kutubxonangiz xodimlarini yangilay olasiz' });
      }
    }

    const updates = { ...req.body };
    if (updates.email) updates.email = updates.email.trim().toLowerCase();
    if ((updates.role === 'kutubxona_xodimi' || updates.role === 'xodimlar_boshligi') && !updates.libraryId && !updates.library_id) {
      updates.libraryId = await resolveLibraryIdForRole(
        {
          role: updates.role,
          libraryId: updates.libraryId,
          viloyatId: updates.viloyatId || existing.viloyatId,
          tumanId: updates.tumanId || existing.tumanId,
        },
        req.user
      );
    }
    delete updates.password_hash;
    delete updates.password;

    const updated = await updateRow('users', req.params.id, updates);
    const { password_hash, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });

    if (req.user.role !== 'super_admin') {
      if (existing.role !== 'kutubxona_xodimi' && existing.role !== 'xodimlar_boshligi') {
        return res.status(403).json({ error: 'Faqat super admin boshqa adminlarni o\'chirishi mumkin' });
      }
      if (existing.viloyatId !== req.user.viloyatId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning viloyatidagi xodimlarni o\'chira olasiz' });
      }
      if (req.user.role === 'tuman_admin' && existing.tumanId !== req.user.tumanId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning tumanidagi xodimlarni o\'chira olasiz' });
      }
      if (req.user.role === 'xodimlar_boshligi' && (existing.libraryId || existing.library_id) !== req.user.libraryId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning kutubxonangiz xodimlarini o\'chira olasiz' });
      }
    }

    const success = await deleteRow('users', req.params.id);
    if (!success) return res.status(404).json({ error: 'Topilmadi' });
    await addAuditLog(req.user.id, 'delete', 'users', `Foydalanuvchi o'chirildi: ${req.params.id}`, req);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Reset password
usersRouter.post('/:id/reset-password', authMiddleware, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Yangi parol talab qilinadi' });
    const hash = bcrypt.hashSync(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    await addAuditLog(req.user.id, 'reset_password', 'users', `Parol tiklandi: ${req.params.id}`, req);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// REPORTS ROUTER
// ============================================================
const reportsRouter = Router();

reportsRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const items = await getAll('reports');
    res.json(items);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const report = await getById('reports', req.params.id);
    if (!report) return res.status(404).json({ error: 'Topilmadi' });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

reportsRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    const body = req.body || {};
    const id = body.id || generateId('rep');
    const todayStr = new Date().toISOString().split('T')[0];
    const obj = {
      id,
      type: body.type || 'monthly',
      title: body.title || '',
      library_id: body.libraryId || body.library_id || req.user.libraryId || req.user.library_id || null,
      user_id: req.user.id,
      viloyat_id: body.viloyatId || body.viloyat_id || req.user.viloyatId || req.user.viloyat_id || null,
      tuman_id: body.tumanId || body.tuman_id || req.user.tumanId || req.user.tuman_id || null,
      status: body.status || 'draft',
      period: body.period || todayStr.slice(0, 7),
      submitted_at: body.status === 'submitted' ? body.submittedAt || todayStr : null,
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null,
      data: typeof body.data === 'object' ? JSON.stringify(body.data || {}) : body.data || '{}',
      description: body.description || '',
      created_at: new Date().toISOString(),
    };
    if (body.targetRole || body.target_role) {
      obj.target_role = body.targetRole || body.target_role;
    }

    const created = await insertRow('reports', obj);
    await addAuditLog(req.user.id, 'create', 'reports', `Yangi hisobot: ${obj.title}`, req);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

reportsRouter.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('reports', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const body = { ...req.body };
    if (body.data && typeof body.data === 'object') body.data = JSON.stringify(body.data);
    const updated = await updateRow('reports', req.params.id, body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

reportsRouter.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('reports', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const body = { ...req.body };
    if (body.data && typeof body.data === 'object') body.data = JSON.stringify(body.data);
    res.json(await updateRow('reports', req.params.id, body));
  } catch (err) {
    next(err);
  }
});

reportsRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await deleteRow('reports', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Submit report
reportsRouter.post('/:id/submit', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('reports', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const todayStr = new Date().toISOString().split('T')[0];
    const updates = { status: 'submitted', submitted_at: todayStr };
    if (!existing.viloyatId && !existing.viloyat_id && (req.user.viloyatId || req.user.viloyat_id)) {
      updates.viloyat_id = req.user.viloyatId || req.user.viloyat_id;
    }
    if (!existing.tumanId && !existing.tuman_id && (req.user.tumanId || req.user.tuman_id)) {
      updates.tuman_id = req.user.tumanId || req.user.tuman_id;
    }
    if (!existing.libraryId && !existing.library_id && (req.user.libraryId || req.user.library_id)) {
      updates.library_id = req.user.libraryId || req.user.library_id;
    }
    if (req.body) {
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description) updates.description = req.body.description;
      if (req.body.data) {
        updates.data = typeof req.body.data === 'object' ? JSON.stringify(req.body.data) : req.body.data;
      }
      if (req.body.targetRole) updates.target_role = req.body.targetRole;
      if (req.body.target_role) updates.target_role = req.body.target_role;
    }
    const updated = await updateRow('reports', req.params.id, updates);
    await addAuditLog(req.user.id, 'submit', 'reports', `Hisobot yuborildi: ${req.params.id}`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Review report (approve/reject)
reportsRouter.post('/:id/review', authMiddleware, async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action: approve yoki reject' });
    }
    const existing = await getById('reports', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const status = action === 'approve' ? 'approved' : 'rejected';
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = await updateRow('reports', req.params.id, {
      status,
      reviewed_at: todayStr,
      reviewed_by: req.user.id,
      review_comment: comment || null,
    });
    await addAuditLog(req.user.id, action, 'reports', `Hisobot ${action}: ${req.params.id}`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// TASKS ROUTER
// ============================================================
const tasksRouter = Router();

tasksRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const items = await getAll('tasks');
    res.json(items);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const task = await getById('tasks', req.params.id);
    if (!task) return res.status(404).json({ error: 'Topilmadi' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    const body = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    // Ommaviy topshiriq yaratish: agar assignedToUsers massiv ko'rinishida berilgan bo'lsa
    if (Array.isArray(body.assignedToUsers) && body.assignedToUsers.length > 0) {
      const createdTasks = [];
      for (const userId of body.assignedToUsers) {
        const targetUser = await getById('users', userId);
        if (!targetUser) continue;

        if (req.user.role === 'tuman_admin') {
          if (targetUser.viloyatId !== req.user.viloyatId || targetUser.tumanId !== req.user.tumanId) {
            continue;
          }
        }

        const id = generateId('task');
        const obj = {
          id,
          title: body.title || '',
          description: body.description || '',
          assigned_by: req.user.id,
          assigned_to: userId,
          library_id: targetUser.libraryId || targetUser.library_id || body.libraryId || req.user.library_id || null,
          priority: body.priority || 'medium',
          status: body.status || 'pending',
          due_date: body.dueDate || null,
          created_at: todayStr,
          completed_at: null,
        };
        const taskRow = await insertRow('tasks', obj);
        createdTasks.push(taskRow);

        await insertRow('notifications', {
          id: generateId('notif'),
          type: 'task',
          title: 'Yangi topshiriq',
          message: `"${body.title || 'Yangi topshiriq'}" topshirig'i sizga biriktirildi`,
          target_user_id: userId,
          target_role: null,
          read: 0,
          created_at: new Date().toISOString(),
        });
      }
      await addAuditLog(
        req.user.id,
        'create',
        'tasks',
        `Topshiriq bir nechta foydalanuvchiga yaratildi: ${body.title} (${createdTasks.length} ta)`,
        req
      );
      return res.status(201).json(createdTasks);
    }

    const id = body.id || generateId('task');

    if (req.user.role === 'tuman_admin' && body.assignedTo) {
      const targetUser = await getById('users', body.assignedTo);
      if (!targetUser) {
        return res.status(404).json({ error: 'Ijrochi foydalanuvchi topilmadi' });
      }
      if (targetUser.viloyatId !== req.user.viloyatId || targetUser.tumanId !== req.user.tumanId) {
        return res.status(403).json({ error: 'Siz faqat o\'zingizning tumaningizdagi xodimlarga topshiriq bera olasiz' });
      }
    }

    const obj = {
      id,
      title: body.title || '',
      description: body.description || '',
      assigned_by: req.user.id,
      assigned_to: body.assignedTo || null,
      library_id: body.libraryId || req.user.library_id || req.user.libraryId || null,
      priority: body.priority || 'medium',
      status: body.status || 'pending',
      due_date: body.dueDate || null,
      created_at: todayStr,
      completed_at: null,
    };
    const createdTask = await insertRow('tasks', obj);

    if (body.assignedTo) {
      await insertRow('notifications', {
        id: generateId('notif'),
        type: 'task',
        title: 'Yangi topshiriq',
        message: `"${obj.title || 'Yangi topshiriq'}" topshirig'i sizga biriktirildi`,
        target_user_id: body.assignedTo,
        target_role: null,
        read: 0,
        created_at: new Date().toISOString(),
      });
    }
    await addAuditLog(req.user.id, 'create', 'tasks', `Yangi topshiriq: ${obj.title}`, req);
    res.status(201).json(createdTask);
  } catch (err) {
    next(err);
  }
});

tasksRouter.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('tasks', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const updated = await updateRow('tasks', req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const existing = await getById('tasks', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    res.json(await updateRow('tasks', req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await deleteRow('tasks', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Update task status
tasksRouter.post('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status talab qilinadi' });
    const existing = await getById('tasks', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const updates = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString().split('T')[0];
    const updated = await updateRow('tasks', req.params.id, updates);
    await addAuditLog(req.user.id, 'update_status', 'tasks', `Topshiriq holati: ${req.params.id} -> ${status}`, req);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// NOTIFICATIONS ROUTER
// ============================================================
const notificationsRouter = Router();

notificationsRouter.get('/', authMiddleware, async (req, res, next) => {
  try {
    const all = await getAll('notifications');
    const userRole = req.user.role;
    const userId = req.user.id;
    const mine = all.filter((n) => {
      if (!n.targetUserId && !n.targetRole) return true;
      if (n.targetUserId === userId) return true;
      if (n.targetRole) {
        const roles = String(n.targetRole).split(',').map((s) => s.trim());
        if (roles.includes(userRole)) return true;
      }
      return false;
    });
    res.json(mine);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const all = await getAll('notifications');
    const userRole = req.user.role;
    const userId = req.user.id;
    const mine = all.filter((n) => {
      if (n.read) return false;
      if (!n.targetUserId && !n.targetRole) return true;
      if (n.targetUserId === userId) return true;
      if (n.targetRole) {
        const roles = String(n.targetRole).split(',').map((s) => s.trim());
        if (roles.includes(userRole)) return true;
      }
      return false;
    });
    res.json({ count: mine.length });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    await updateRow('notifications', req.params.id, { read: 1 });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/read-all', authMiddleware, async (req, res, next) => {
  try {
    const all = await getAll('notifications');
    const userRole = req.user.role;
    const userId = req.user.id;
    for (const n of all) {
      const isTarget =
        (!n.targetUserId && !n.targetRole) ||
        n.targetUserId === userId ||
        (n.targetRole && String(n.targetRole).split(',').map((s) => s.trim()).includes(userRole));
      if (isTarget && !n.read) {
        await updateRow('notifications', n.id, { read: 1 });
      }
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
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
      created_at: new Date().toISOString(),
    };
    const created = await insertRow('notifications', obj);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await deleteRow('notifications', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// SETTINGS ROUTER
// ============================================================
const settingsRouter = Router();

settingsRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const rowsRes = await query('SELECT "key", value FROM settings');
    const settings = {};
    for (const row of rowsRes.rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/', authMiddleware, async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await setSetting(key, value);
    }
    await addAuditLog(req.user.id, 'update', 'settings', 'Tizim sozlamalari yangilandi', req);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// AUDIT LOG ROUTER
// ============================================================
const auditRouter = Router();

auditRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const logs = await getAll('audit_log', '1=1 ORDER BY timestamp DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

auditRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { action, module, details } = req.body;
    const id = generateId('log');
    const row = await insertRow('audit_log', {
      id,
      user_id: req.user.id,
      action: action || 'unknown',
      module: module || 'unknown',
      details: details || '',
      ip_address: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DASHBOARD ROUTER - Aggregate statistics
// ============================================================
const dashboardRouter = Router();

dashboardRouter.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const [
      libRes,
      actRes,
      repRes,
      repPendingRes,
      taskRes,
      taskPendingRes,
      eventRes,
      eventUpcomingRes,
      invRes,
      appRes,
      appNewRes,
      userRes,
      reportsStatusRes,
      tasksStatusRes,
      notifs,
    ] = await Promise.all([
      query('SELECT COUNT(*) as c FROM libraries'),
      query('SELECT COUNT(*) as c FROM activities'),
      query('SELECT COUNT(*) as c FROM reports'),
      query("SELECT COUNT(*) as c FROM reports WHERE status IN ('draft','submitted','under_review')"),
      query('SELECT COUNT(*) as c FROM tasks'),
      query("SELECT COUNT(*) as c FROM tasks WHERE status IN ('pending','in_progress')"),
      query('SELECT COUNT(*) as c FROM events'),
      query("SELECT COUNT(*) as c FROM events WHERE status = 'upcoming'"),
      query('SELECT COUNT(*) as c FROM inventory'),
      query('SELECT COUNT(*) as c FROM appeals'),
      query("SELECT COUNT(*) as c FROM appeals WHERE status = 'new'"),
      query('SELECT COUNT(*) as c FROM users'),
      query('SELECT status, COUNT(*) as count FROM reports GROUP BY status'),
      query('SELECT status, COUNT(*) as count FROM tasks GROUP BY status'),
      getAll('notifications'),
    ]);

    const stats = {
      totalLibraries: parseInt(libRes.rows[0]?.c || 0, 10),
      totalActivities: parseInt(actRes.rows[0]?.c || 0, 10),
      totalReports: parseInt(repRes.rows[0]?.c || 0, 10),
      pendingReports: parseInt(repPendingRes.rows[0]?.c || 0, 10),
      totalTasks: parseInt(taskRes.rows[0]?.c || 0, 10),
      pendingTasks: parseInt(taskPendingRes.rows[0]?.c || 0, 10),
      totalEvents: parseInt(eventRes.rows[0]?.c || 0, 10),
      upcomingEvents: parseInt(eventUpcomingRes.rows[0]?.c || 0, 10),
      totalInventory: parseInt(invRes.rows[0]?.c || 0, 10),
      totalAppeals: parseInt(appRes.rows[0]?.c || 0, 10),
      newAppeals: parseInt(appNewRes.rows[0]?.c || 0, 10),
      totalUsers: parseInt(userRes.rows[0]?.c || 0, 10),
      reportsByStatus: reportsStatusRes.rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      tasksByStatus: tasksStatusRes.rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      unreadNotifications: notifs.filter(
        (n) => (n.targetUserId === req.user.id || n.targetRole === req.user.role) && !n.read
      ).length,
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
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
