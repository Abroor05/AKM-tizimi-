// ============================================================
// AUTH MIDDLEWARE - JWT verification
// ============================================================
import jwt from 'jsonwebtoken';
import { getById } from '../db/database.js';

const JWT_SECRET = 'kbt-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT and attach user to request
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token talab qilinadi' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getById('users', decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki faol emas' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Yaroqsiz token' });
  }
}

// Optional auth - doesn't fail if no token, but attaches user if present
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = getById('users', decoded.id);
      if (user && user.active) req.user = user;
    } catch {
      // Ignore invalid tokens
    }
  }
  next();
}

// Role-based access control
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }
    next();
  };
}

export { JWT_SECRET };
