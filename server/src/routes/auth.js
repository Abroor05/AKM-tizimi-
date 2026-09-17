// ============================================================
// AUTH ROUTES - login, me, logout
// ============================================================
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { getById, getAll, updateRow, insertRow, getSetting, setSetting } from '../db/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/auth/bootstrap-check - check if initial setup is needed
router.get('/bootstrap-check', (_req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  res.json({ needsBootstrap: userCount === 0, userCount });
});

// POST /api/auth/bootstrap - create the first real administrator on an empty database
router.post('/bootstrap', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return res.status(409).json({ error: 'Boshlang\'ich administrator allaqachon yaratilgan' });
  }

  const { username, password, fullName, phone, email } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'username, password va fullName talab qilinadi' });
  }

  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, phone, email, active, created_at, last_login) VALUES (?, ?, ?, ?, 'super_admin', ?, ?, 1, ?, NULL)`)
    .run(id, username.trim(), passwordHash, fullName, phone || null, email || null, new Date().toISOString().split('T')[0]);

  const user = getById('users', id);
  const token = generateToken(user);
  const { password_hash, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Login va parol talab qilinadi' });
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!row) {
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri!' });
  }
  if (row.active !== 1) {
    return res.status(401).json({ error: 'Hisob faol emas' });
  }

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri!' });
  }

  // Update last login
  const todayStr = new Date().toISOString().split('T')[0];
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(todayStr, row.id);

  const user = getById('users', row.id);
  const token = generateToken(user);

  // Audit log
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  insertRow('audit_log', {
    id: logId,
    user_id: user.id,
    action: 'login',
    module: 'auth',
    details: 'Tizimga kirildi',
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  res.json({ token, user });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  insertRow('audit_log', {
    id: logId,
    user_id: req.user.id,
    action: 'logout',
    module: 'auth',
    details: 'Tizimdan chiqildi',
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true });
});

// POST /api/auth/register (super admin only)
router.post('/register', authMiddleware, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Faqat Super Admin yangi foydalanuvchi qo\'sha oladi' });
  }
  const { username, password, fullName, role, phone, email, viloyatId, tumanId, libraryId } = req.body;
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmadi' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) {
    return res.status(409).json({ error: 'Bu login allaqachon mavjud' });
  }
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role, phone, email, viloyat_id, tuman_id, library_id, active, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
    .run(id, username.trim(), passwordHash, fullName, role, phone || null, email || null, viloyatId || null, tumanId || null, libraryId || null, new Date().toISOString().split('T')[0], null);

  const user = getById('users', id);
  res.status(201).json(user);
});

export default router;
