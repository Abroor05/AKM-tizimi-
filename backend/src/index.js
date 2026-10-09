// ============================================================
// KBT SERVER - Express app entry point
// ============================================================
import express from 'express';
import cors from 'cors';
import db from './db/database.js';
import { mountCrudRoutes } from './routes/crud.js';
import { mountSpecialRoutes } from './routes/special.js';
import authRouter from './routes/auth.js';
import { setupSwagger } from './swagger.js';
import { authMiddleware } from './middleware/auth.js';
import { securityHeaders, apiRateLimiter, sanitizeInputs } from './middleware/security.js';

// .env konfiguratsiyasini yuklash
try {
  process.loadEnvFile();
} catch {
  // Agar .env fayli bo'lmasa, default sozlamalar ishlaydi
}

const app = express();
const PORT = process.env.PORT || 5000;

// --- Xavfsizlik sarlavhalari (Helmet) ---
app.use(securityHeaders);

// --- Middleware ---
const configuredOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  ...configuredOrigins,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Mobil ilovalar, curl yoki bir xil origin so'rovlariga ruxsat berish
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error('CORS: Ruxsat berilmagan domen'));
  },
  credentials: true,
}));

// DoS hujumlaridan himoya: JSON hajmi chegarasi 2mb
app.use(express.json({ limit: '2mb' }));

// Input sanitization (XSS himoyasi)
app.use(sanitizeInputs);

// Umumiy API Rate Limiter
app.use('/api', apiRateLimiter);

// --- Request logging ---
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Swagger Documentation ---
setupSwagger(app);

// --- Auth routes ---
app.use('/api/auth', authRouter);

// --- CRUD routes (libraries, books, readers, activities, events, inventory, documents, appeals, kpi-data) ---
mountCrudRoutes(app);

// --- Special routes (users, reports, tasks, notifications, settings, audit-log, dashboard) ---
mountSpecialRoutes(app);

// --- Reset data endpoint (Xavfsiz: faqat super_admin va maxsus tasdiq kodi bilan) ---
app.post('/api/reset', authMiddleware, (req, res) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Faqat Super Admin bazani tozalashi mumkin' });
  }

  if (process.env.RESET_DATABASE_ALLOWED !== 'true') {
    return res.status(403).json({
      error: 'Xavfsizlik: Bazani tozalash funksiyasi o\'chirilgan (RESET_DATABASE_ALLOWED=false)',
    });
  }

  const { confirmCode } = req.body || {};
  if (confirmCode !== 'CONFIRM_DELETE_ALL') {
    return res.status(400).json({ error: 'Xavfsizlik tasdiq kodi noto\'g\'ri' });
  }

  const tables = ['users', 'libraries', 'books', 'readers', 'activities', 'reports', 'tasks', 'events', 'inventory', 'documents', 'appeals', 'notifications', 'kpi_data', 'audit_log', 'settings'];
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`);
  }
  res.json({ success: true, message: 'Ma\'lumotlar xavfsiz tarzda tozalandi' });
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'Server xatosi' });
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  KBT Server ishga tushdi!`);
  console.log(`  Port: ${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log(`  Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`  OpenAPI JSON: http://localhost:${PORT}/api/docs.json`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
