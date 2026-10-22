// ============================================================
// AUTH ROUTES - login, me, logout (PostgreSQL)
// ============================================================
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getById, insertRow, query } from '../db/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';

const router = Router();

async function resolveLibraryIdForRole({ role, libraryId, viloyatId, tumanId }) {
  const libraryRoles = ['kutubxona_xodimi', 'xodimlar_boshligi'];
  if (!libraryRoles.includes(role)) return libraryId || null;
  if (libraryId) return libraryId;
  if (!viloyatId || !tumanId) return null;

  const res = await query(
    'SELECT id FROM libraries WHERE viloyat_id = ? AND tuman_id = ? ORDER BY created_at DESC, id ASC LIMIT 1',
    [viloyatId, tumanId]
  );
  return res.rows[0]?.id || null;
}

// GET /api/auth/bootstrap-check - check if initial setup is needed
router.get('/bootstrap-check', async (_req, res, next) => {
  try {
    const resDb = await query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(resDb.rows[0]?.count || 0, 10);
    res.json({ needsBootstrap: userCount === 0, userCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/bootstrap - create the first real administrator on an empty database
router.post('/bootstrap', async (req, res, next) => {
  try {
    const resDb = await query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(resDb.rows[0]?.count || 0, 10);
    if (userCount > 0) {
      return res.status(409).json({ error: 'Boshlang\'ich administrator allaqachon yaratilgan' });
    }

    const { username, password, fullName, phone, email } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'username, password va fullName talab qilinadi' });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      const duplicateRes = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
      if (duplicateRes.rows.length > 0) {
        return res.status(409).json({ error: 'Bu email allaqachon ishlatilgan' });
      }
    }

    const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO users (id, username, password_hash, full_name, role, phone, email, active, created_at, last_login) VALUES (?, ?, ?, ?, 'super_admin', ?, ?, 1, ?, NULL)`,
      [id, username.trim(), passwordHash, fullName, phone || null, normalizedEmail || null, today]
    );

    const user = await getById('users', id);
    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Login va parol talab qilinadi' });
    }

    const cleanUsername = String(username).trim();
    const resUser = await query('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    const row = resUser.rows[0];

    if (!row) {
      // Xavfsizlik: Muvaffaqiyatsiz urinishni qayd etish
      const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await insertRow('audit_log', {
        id: logId,
        user_id: 'unknown',
        action: 'failed_login',
        module: 'auth',
        details: `Mavjud bo'lmagan foydalanuvchi orqali kirish urinishi: ${cleanUsername}`,
        ip_address: req.ip || '127.0.0.1',
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri!' });
    }

    if (row.active !== 1 && row.active !== true) {
      return res.status(401).json({ error: 'Hisob faol emas' });
    }

    const valid = bcrypt.compareSync(password, row.password_hash);
    if (!valid) {
      // Xavfsizlik: Noto'g'ri parol urinishini qayd etish
      const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await insertRow('audit_log', {
        id: logId,
        user_id: row.id,
        action: 'failed_login',
        module: 'auth',
        details: `Noto'g'ri parol bilan kirish urinishi: ${cleanUsername}`,
        ip_address: req.ip || '127.0.0.1',
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri!' });
    }

    // Update last login
    const todayStr = new Date().toISOString().split('T')[0];
    await query('UPDATE users SET last_login = ? WHERE id = ?', [todayStr, row.id]);

    const user = await getById('users', row.id);
    const token = generateToken(user);

    // Audit log
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await insertRow('audit_log', {
      id: logId,
      user_id: user.id,
      action: 'login',
      module: 'auth',
      details: 'Tizimga muvaffaqiyatli kirildi',
      ip_address: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await insertRow('audit_log', {
      id: logId,
      user_id: req.user.id,
      action: 'logout',
      module: 'auth',
      details: 'Tizimdan chiqildi',
      ip_address: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register (super admin only)
router.post('/register', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Faqat Super Admin yangi foydalanuvchi qo\'sha oladi' });
    }
    const { username, password, fullName, role, phone, email, viloyatId, tumanId, libraryId } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmadi' });
    }
    const existsRes = await query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existsRes.rows.length > 0) {
      return res.status(409).json({ error: 'Bu login allaqachon mavjud' });
    }
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      const duplicateRes = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
      if (duplicateRes.rows.length > 0) {
        return res.status(409).json({ error: 'Bu email allaqachon ishlatilgan' });
      }
    }
    const effectiveLibraryId = await resolveLibraryIdForRole({ role, libraryId, viloyatId, tumanId });
    const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO users (id, username, password_hash, full_name, role, phone, email, viloyat_id, tuman_id, library_id, active, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, username.trim(), passwordHash, fullName, role, phone || null, normalizedEmail || null, viloyatId || null, tumanId || null, effectiveLibraryId || null, today, null]
    );

    const user = await getById('users', id);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
