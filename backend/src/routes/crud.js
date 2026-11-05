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

      // Ruxsatlarni tekshirish (Staff uchun faqat adminlar)
      if (tableName === 'staff') {
        const allowedRoles = ['super_admin', 'superadmin', 'viloyat_admin', 'tuman_admin', 'direktor', 'xodimlar_boshligi'];
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ error: "Xodimlarni ro'yxatga olish uchun ruxsat berilmagan" });
        }
      }

      const id = body.id || generateId(prefix);
      const obj = { ...body, id };

      // Staff uchun qo'shimcha maydonlarni to'ldirish
      if (tableName === 'staff') {
        const isDistrictAdmin = ['tuman_admin', 'direktor', 'xodimlar_boshligi', 'kutubxona_xodimi'].includes(req.user.role);

        let libId = null;
        let vId = null;
        let tId = null;

        if (isDistrictAdmin) {
          // Tuman admini (Direktor): Xodim qat'iy ravishda o'sha tumanga va kutubxonasiga tegishli bo'ladi!
          vId = req.user.viloyatId || req.user.viloyat_id || obj.viloyatId || obj.viloyat_id || '';
          tId = req.user.tumanId || req.user.tuman_id || obj.tumanId || obj.tuman_id || '';

          if (req.user.libraryId || req.user.library_id) {
            libId = req.user.libraryId || req.user.library_id;
          }
          if (!libId && (obj.libraryId || obj.library_id)) {
            libId = obj.libraryId || obj.library_id;
          }

          if (!libId && vId && tId) {
            const libRes = await query(
              'SELECT id FROM libraries WHERE viloyat_id = ? AND tuman_id = ? ORDER BY id ASC LIMIT 1',
              [vId, tId]
            );
            if (libRes.rows[0]) {
              libId = libRes.rows[0].id;
            } else {
              const newLibId = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              const libName = `AKM Kutubxonasi (${tId})`;
              await query(
                'INSERT INTO libraries (id, name, type, viloyat_id, tuman_id, address, phone, email, staff_count, founding_year, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)',
                [newLibId, libName, 'district', vId, tId, '', '', '', new Date().getFullYear(), 'active', new Date().toISOString()]
              );
              libId = newLibId;
            }
          }
        } else if (req.user.role === 'viloyat_admin') {
          vId = req.user.viloyatId || req.user.viloyat_id || obj.viloyatId || obj.viloyat_id || '';
          libId = obj.library_id || obj.libraryId;
          if (libId) {
            const checkLib = await getById('libraries', libId);
            if (checkLib && (checkLib.viloyatId === vId || checkLib.viloyat_id === vId)) {
              tId = checkLib.tumanId || checkLib.tuman_id;
            } else {
              libId = null;
            }
          }
          if (!libId && vId) {
            const libRes = await query('SELECT id, tuman_id FROM libraries WHERE viloyat_id = ? ORDER BY id ASC LIMIT 1', [vId]);
            if (libRes.rows[0]) {
              libId = libRes.rows[0].id;
              tId = libRes.rows[0].tuman_id;
            }
          }
        } else {
          // Super admin
          libId = obj.library_id || obj.libraryId;
          if (!libId) {
            const libRes = await query('SELECT id, viloyat_id, tuman_id FROM libraries ORDER BY id ASC LIMIT 1');
            if (libRes.rows[0]) {
              libId = libRes.rows[0].id;
              vId = libRes.rows[0].viloyat_id;
              tId = libRes.rows[0].tuman_id;
            }
          } else {
            const lib = await getById('libraries', libId);
            if (lib) {
              vId = lib.viloyatId || lib.viloyat_id;
              tId = lib.tumanId || lib.tuman_id;
            }
          }
        }

        // Agar kutubxona umuman topilmasa, bazadagi ixtiyoriy kutubxonani olish yoki yaratish
        if (!libId) {
          const anyLib = await query('SELECT id, viloyat_id, tuman_id FROM libraries LIMIT 1');
          if (anyLib.rows[0]) {
            libId = anyLib.rows[0].id;
            vId = vId || anyLib.rows[0].viloyat_id;
            tId = tId || anyLib.rows[0].tuman_id;
          } else {
            libId = 'lib_main';
            await query(
              'INSERT INTO libraries (id, name, type, status, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
              [libId, 'Markaziy kutubxona', 'markaz', 'active', new Date().toISOString()]
            );
          }
        }

        obj.library_id = libId;
        delete obj.libraryId;
        obj.viloyat_id = vId || obj.viloyat_id || obj.viloyatId || '';
        obj.tuman_id = tId || obj.tuman_id || obj.tumanId || '';
        delete obj.viloyatId;
        delete obj.tumanId;

        const fn = obj.first_name || obj.firstName || '';
        const ln = obj.last_name || obj.lastName || '';
        const mn = obj.middle_name || obj.middleName || '';
        obj.first_name = fn;
        obj.last_name = ln;
        obj.middle_name = mn;
        delete obj.firstName;
        delete obj.lastName;
        delete obj.middleName;

        if (!obj.full_name) {
          obj.full_name = [ln, fn, mn].filter(Boolean).join(' ').trim() || `${fn} ${ln}`.trim() || 'Kutubxona xodimi';
        }
      }

      const tableCols = await getTableColumns(tableName);
      if (tableCols.has('created_at')) {
        obj.created_at = body.createdAt || obj.created_at || new Date().toISOString();
      }
      delete obj.createdAt;

      const created = await insertRow(tableName, obj);

      // Kutubxonaning xodimlar sonini yangilash
      if (tableName === 'staff' && (obj.library_id || obj.libraryId)) {
        const libId = obj.library_id || obj.libraryId;
        try {
          const countRes = await query('SELECT COUNT(*) as count FROM staff WHERE library_id = ?', [libId]);
          const newCount = parseInt(countRes.rows[0]?.count || 0, 10);
          await query('UPDATE libraries SET staff_count = ? WHERE id = ?', [newCount, libId]);
        } catch {
          // ignore count error
        }
      }

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
      if (tableName === 'staff') {
        const allowedRoles = ['super_admin', 'superadmin', 'viloyat_admin', 'tuman_admin', 'direktor', 'xodimlar_boshligi'];
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ error: "Xodimlarni tahrirlash uchun ruxsat berilmagan" });
        }
      }

      const existing = await getById(tableName, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Topilmadi' });

      const updates = { ...req.body };
      if (tableName === 'staff') {
        const isDistrictAdmin = ['tuman_admin', 'xodimlar_boshligi', 'kutubxona_xodimi'].includes(req.user.role);
        if (isDistrictAdmin) {
          updates.viloyat_id = req.user.viloyatId || req.user.viloyat_id || existing.viloyat_id;
          updates.tuman_id = req.user.tumanId || req.user.tuman_id || existing.tuman_id;
          if (existing.library_id) {
            updates.library_id = existing.library_id;
          }
        }
        const fn = updates.first_name || updates.firstName || existing.first_name || existing.firstName || '';
        const ln = updates.last_name || updates.lastName || existing.last_name || existing.lastName || '';
        const mn = updates.middle_name !== undefined ? updates.middle_name : (updates.middleName !== undefined ? updates.middleName : (existing.middle_name || existing.middleName || ''));
        updates.full_name = [ln, fn, mn].filter(Boolean).join(' ').trim() || `${fn} ${ln}`.trim();
        if (updates.libraryId && !isDistrictAdmin) {
          updates.library_id = updates.libraryId;
        }
      }

      const updated = await updateRow(tableName, req.params.id, updates);

      if (tableName === 'staff') {
        const libId = updated?.libraryId || updated?.library_id || existing?.libraryId || existing?.library_id;
        if (libId) {
          try {
            const countRes = await query('SELECT COUNT(*) as count FROM staff WHERE library_id = ?', [libId]);
            const newCount = parseInt(countRes.rows[0]?.count || 0, 10);
            await query('UPDATE libraries SET staff_count = ? WHERE id = ?', [newCount, libId]);
          } catch {}
        }
      }

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
      if (tableName === 'staff') {
        const allowedRoles = ['super_admin', 'superadmin', 'viloyat_admin', 'tuman_admin', 'direktor', 'xodimlar_boshligi'];
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ error: "Xodimlarni tahrirlash uchun ruxsat berilmagan" });
        }
      }

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
      if (tableName === 'staff') {
        const allowedRoles = ['super_admin', 'superadmin', 'viloyat_admin', 'tuman_admin', 'direktor', 'xodimlar_boshligi'];
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ error: "Xodimlarni o'chirish uchun ruxsat berilmagan" });
        }
      }

      const existing = tableName === 'staff' ? await getById(tableName, req.params.id) : null;
      const success = await deleteRow(tableName, req.params.id);
      if (!success) return res.status(404).json({ error: 'Topilmadi' });

      if (tableName === 'staff' && existing) {
        const libId = existing.libraryId || existing.library_id;
        if (libId) {
          try {
            const countRes = await query('SELECT COUNT(*) as count FROM staff WHERE library_id = ?', [libId]);
            const newCount = parseInt(countRes.rows[0]?.count || 0, 10);
            await query('UPDATE libraries SET staff_count = ? WHERE id = ?', [newCount, libId]);
          } catch {}
        }
      }

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
