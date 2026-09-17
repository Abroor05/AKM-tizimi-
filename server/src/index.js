// ============================================================
// KBT SERVER - Express app entry point
// ============================================================
import express from 'express';
import cors from 'cors';
import db from './db/database.js';
import { mountCrudRoutes } from './routes/crud.js';
import { mountSpecialRoutes } from './routes/special.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In production, allow all origins if CORS_ALLOW_ALL is set
    if (process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);
    return callback(null, true); // Permissive for now
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// --- Request logging ---
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Auth routes ---
app.use('/api/auth', authRouter);

// --- CRUD routes (libraries, books, readers, activities, events, inventory, documents, appeals, kpi-data) ---
mountCrudRoutes(app);

// --- Special routes (users, reports, tasks, notifications, settings, audit-log, dashboard) ---
mountSpecialRoutes(app);

// --- Reset data endpoint ---
app.post('/api/reset', (_req, res) => {
  const tables = ['users', 'libraries', 'books', 'readers', 'activities', 'reports', 'tasks', 'events', 'inventory', 'documents', 'appeals', 'notifications', 'kpi_data', 'audit_log', 'settings'];
  for (const table of tables) {
    db.exec(`DELETE FROM ${table}`);
  }
  res.json({ success: true, message: 'Ma\'lumotlar tozalandi' });
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'Server xatosi' });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  KBT Server ishga tushdi!`);
  console.log(`  Port: ${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
