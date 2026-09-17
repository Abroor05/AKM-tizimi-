// ============================================================
// GENERIC CRUD ROUTE FACTORY
// ============================================================
import { Router } from 'express';
import db, { getAll, getById, insertRow, updateRow, deleteRow, rowToObject, objectToRow } from '../db/database.js';
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
  router.get('/', authMiddleware, (req, res) => {
    const items = getAll(tableName);
    res.json(items);
  });

  // GET /api/{entity}/:id - get one
  router.get('/:id', authMiddleware, (req, res) => {
    const item = getById(tableName, req.params.id);
    if (!item) return res.status(404).json({ error: 'Topilmadi' });
    res.json(item);
  });

  // POST /api/{entity} - create
  router.post('/', authMiddleware, (req, res) => {
    const body = req.body;
    const id = body.id || generateId(prefix);
    const obj = { ...body, id, created_at: body.createdAt || new Date().toISOString() };
    // Remove camelCase duplicates that will be converted
    delete obj.createdAt;
    const row = objectToRow(tableName, obj);
    const keys = Object.keys(row);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => row[k]);
    db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
    const created = getById(tableName, id);
    res.status(201).json(created);
  });

  // PUT /api/{entity}/:id - update
  router.put('/:id', authMiddleware, (req, res) => {
    const existing = getById(tableName, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const updated = updateRow(tableName, req.params.id, req.body);
    res.json(updated);
  });

  // PATCH /api/{entity}/:id - partial update
  router.patch('/:id', authMiddleware, (req, res) => {
    const existing = getById(tableName, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Topilmadi' });
    const updated = updateRow(tableName, req.params.id, req.body);
    res.json(updated);
  });

  // DELETE /api/{entity}/:id - delete
  router.delete('/:id', authMiddleware, (req, res) => {
    const success = deleteRow(tableName, req.params.id);
    if (!success) return res.status(404).json({ error: 'Topilmadi' });
    res.json({ success: true });
  });

  return router;
}

// Export all entity routes
export function mountCrudRoutes(app) {
  for (const [apiPath, tableName] of Object.entries(ENTITY_CONFIG)) {
    app.use(`/api/${apiPath}`, createCrudRouter(apiPath, tableName));
  }
}
