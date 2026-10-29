// ============================================================
// GENERIC CRUD ROUTE FACTORY (PostgreSQL)
// ============================================================
import { Router } from 'express';
import { getAll, getById, insertRow, updateRow, deleteRow, getTableColumns, query } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

// Entity configuration: maps API path -> DB table name
const ENTITY_CONFIG = {
  'libraries': 'libraries',
  'books': 'books',
  'readers': 'readers',
  'activities': 'activities',
  'events': 'events',
  'inventory': 'inventory',
  'documents': 'documents',
  'appeals': 'appeals',
  'kpi-data': 'kpi_data',
};

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ID prefixes per entity
const ID_PREFIXES = {
  'libraries': 'lib',
  'books': 'b',
  'readers': 'r',
  'activities': 'a',
  'events': 'ev',
  'inventory': 'inv',
  'documents': 'doc',
  'appeals': 'ap',
  'kpi-data': 'kpi',
};

export function createCrudRouter(apiPath, tableName) {
  const router = Router();
  const prefix = ID_PREFIXES[apiPath] || 'ent';

  // GET /api/{entity} - list all
  router.get('/', authMiddleware, async (_req, res, next) => {
    try {
      const items = await getAll(tableName);
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/{entity}/:id - get one
  router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
      const item = await getById(tableName, req.params.id);
      if (!item) return res.status(404).json({ error: 'Topilmadi' });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/{entity} - create
  router.post('/', authMiddleware, async (req, res, next) => {
    try {
      const body = req.body || {};
      const id = body.id || generateId(prefix);
      const obj = { ...body, id };

      const tableCols = await getTableColumns(tableName);
      if (tableCols.has('created_at')) {
        obj.created_at = body.createdAt || obj.created_at || new Date().toISOString();
      }
      delete obj.createdAt;

      const created = await insertRow(tableName, obj);

      // Agar faoliyat (kunlik hisobot) topshirilgan bo'lsa, eslatma bildirishnomasini o'qilgan deb belgilash
      if (tableName === 'activities' && (obj.type === 'daily_report' || obj.type === 'daily')) {
        const todayStr = new Date().toISOString().split('T')[0];
        const statusVal = obj.status || 'completed';
        if (['submitted', 'sent', 'accepted', 'completed'].includes(statusVal)) {
          query("UPDATE notifications SET read = 1 WHERE target_user_id = ? AND date = ? AND title LIKE '%Kunlik hisobot%' AND read = 0", [req.user.id, todayStr]).catch(() => {});
        }
      }

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/{entity}/:id - update
  router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
      const existing = await getById(tableName, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Topilmadi' });
      const updated = await updateRow(tableName, req.params.id, req.body);
      if (tableName === 'activities') {
        const todayStr = new Date().toISOString().split('T')[0];
        const statusVal = req.body?.status || updated?.status;
        if (['submitted', 'sent', 'accepted', 'completed'].includes(statusVal)) {
          const uId = updated?.userId || updated?.user_id || req.user.id;
          query("UPDATE notifications SET read = 1 WHERE target_user_id = ? AND date = ? AND title LIKE '%Kunlik hisobot%' AND read = 0", [uId, todayStr]).catch(() => {});
        }
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/{entity}/:id - partial update
  router.patch('/:id', authMiddleware, async (req, res, next) => {
    try {
      const existing = await getById(tableName, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Topilmadi' });
      const updated = await updateRow(tableName, req.params.id, req.body);
      if (tableName === 'activities') {
        const todayStr = new Date().toISOString().split('T')[0];
        const statusVal = req.body?.status || updated?.status;
        if (['submitted', 'sent', 'accepted', 'completed'].includes(statusVal)) {
          const uId = updated?.userId || updated?.user_id || req.user.id;
          query("UPDATE notifications SET read = 1 WHERE target_user_id = ? AND date = ? AND title LIKE '%Kunlik hisobot%' AND read = 0", [uId, todayStr]).catch(() => {});
        }
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/{entity}/:id - delete
  router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
      const success = await deleteRow(tableName, req.params.id);
      if (!success) return res.status(404).json({ error: 'Topilmadi' });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Export all entity routes
export function mountCrudRoutes(app) {
  for (const [apiPath, tableName] of Object.entries(ENTITY_CONFIG)) {
    app.use(`/api/${apiPath}`, createCrudRouter(apiPath, tableName));
  }
}
