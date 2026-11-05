// ============================================================
// STAFF ROUTER - Kutubxona xodimlari (Kadrlar boshqaruvi)
// Faqat 'staff' jadvali bilan ishlaydi, 'users' ga aralashmaydi.
// ============================================================
import { Router } from 'express';
import { getAll, getById, insertRow, updateRow, deleteRow, query } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const staffRouter = Router();

// Ruxsat etilgan admin rollari
const ALLOWED_STAFF_MANAGERS = [
  'super_admin',
  'superadmin',
  'viloyat_admin',
  'tuman_admin',
  'direktor',
  'xodimlar_boshligi',
];

// Helper: Xizmat rahbari lavozimini tekshirish
export function isXizmatRahbariRole(pos) {
  if (!pos) return false;
  const p = pos.toString().trim().toLowerCase();
  return p === 'xizmat rahbari' || p === 'xizmat_rahbari' || p === 'xizmat-rahbari';
}

// GET /api/staff - Barcha xodimlarni olish (faqat staff jadvalidan)
staffRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const items = await getAll('staff');
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/:id - Bitta xodimni olish
staffRouter.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await getById('staff', req.params.id);
    if (!item) return res.status(404).json({ error: 'Xodim topilmadi' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/staff - Yangi xodim qo'shish (faqat staff jadvaliga)
staffRouter.post('/', authMiddleware, async (req, res, next) => {
  try {
    if (!ALLOWED_STAFF_MANAGERS.includes(req.user.role)) {
      return res.status(403).json({ error: "Xodimlarni ro'yxatga olish uchun ruxsat berilmagan" });
    }

    const body = req.body || {};

    // 1. Ism-familiya
    const firstName = (body.firstName || body.first_name || '').trim();
    const lastName = (body.lastName || body.last_name || '').trim();
    const middleName = (body.middleName || body.middle_name || '').trim();
    const fullName = (
      body.fullName ||
      body.full_name ||
      [lastName, firstName, middleName].filter(Boolean).join(' ') ||
      `${firstName} ${lastName}`.trim() ||
      'Kutubxona xodimi'
    ).trim();

    // 2. Lavozimni moslashuvchan qabul qilish (position, lavozim, role, job_title)
    const rawPos = (body.position || body.lavozim || body.role || body.job_title || body.jobTitle || '').trim();
    const position = rawPos || 'Mutaxassis';

    // 3. Dinamik Bo'limlar tekshiruvi: Faqat 'Xizmat rahbari' bo'lsagina bo'lim saqlanadi
    const isRahbar = isXizmatRahbariRole(position);
    const department = isRahbar
      ? (body.department || body.bolim || body.division || null)
      : null;

    // 4. Hudud va kutubxona aniqlash
    const isDistrictUser = ['tuman_admin', 'direktor', 'xodimlar_boshligi', 'kutubxona_xodimi'].includes(req.user.role);

    let vId = null;
    let tId = null;
    let libId = null;

    if (isDistrictUser) {
      vId = req.user.viloyatId || req.user.viloyat_id || body.viloyatId || body.viloyat_id || '';
      tId = req.user.tumanId || req.user.tuman_id || body.tumanId || body.tuman_id || '';
      libId = req.user.libraryId || req.user.library_id || body.libraryId || body.library_id || null;

      // Agar kutubxona belgilanmagan bo'lsa, avtomatik biriktirish yoki yaratish
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
      vId = req.user.viloyatId || req.user.viloyat_id || body.viloyatId || body.viloyat_id || '';
      libId = body.libraryId || body.library_id || null;
      if (libId) {
        const checkLib = await getById('libraries', libId);
        tId = checkLib?.tumanId || checkLib?.tuman_id || '';
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
      libId = body.libraryId || body.library_id || null;
      if (libId) {
        const lib = await getById('libraries', libId);
        vId = lib?.viloyatId || lib?.viloyat_id || '';
        tId = lib?.tumanId || lib?.tuman_id || '';
      } else {
        vId = body.viloyatId || body.viloyat_id || '';
        tId = body.tumanId || body.tuman_id || '';
      }
    }

    const id = body.id || `stf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const staffData = {
      id,
      library_id: libId,
      viloyat_id: vId,
      tuman_id: tId,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      full_name: fullName,
      position,
      department,
      specialty: body.specialty || '',
      experience: body.experience || '',
      birth_date: body.birthDate || body.birth_date || '',
      phone: body.phone || '',
      photo: body.photo || '',
      status: body.status || 'active',
      created_at: body.createdAt || new Date().toISOString(),
    };

    const created = await insertRow('staff', staffData);

    // Kutubxonaning xodimlar sonini yangilash
    if (libId) {
      try {
        const countRes = await query('SELECT COUNT(*) as count FROM staff WHERE library_id = ?', [libId]);
        const newCount = parseInt(countRes.rows[0]?.count || 0, 10);
        await query('UPDATE libraries SET staff_count = ? WHERE id = ?', [newCount, libId]);
      } catch {}
    }

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/staff/:id - Xodim ma'lumotlarini tahrirlash
staffRouter.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!ALLOWED_STAFF_MANAGERS.includes(req.user.role)) {
      return res.status(403).json({ error: "Xodimlarni tahrirlash uchun ruxsat berilmagan" });
    }

    const existing = await getById('staff', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Xodim topilmadi' });

    const updates = { ...req.body };

    // Ism-familiya
    const fn = updates.firstName !== undefined ? updates.firstName : (updates.first_name !== undefined ? updates.first_name : (existing.firstName || existing.first_name || ''));
    const ln = updates.lastName !== undefined ? updates.lastName : (updates.last_name !== undefined ? updates.last_name : (existing.lastName || existing.last_name || ''));
    const mn = updates.middleName !== undefined ? updates.middleName : (updates.middle_name !== undefined ? updates.middle_name : (existing.middleName || existing.middle_name || ''));
    updates.first_name = fn;
    updates.last_name = ln;
    updates.middle_name = mn;
    updates.full_name = [ln, fn, mn].filter(Boolean).join(' ').trim() || `${fn} ${ln}`.trim();

    // Lavozim va bo'lim (Xizmat rahbari bo'lmasa bo'lim null qilinadi)
    const pos = updates.position || updates.lavozim || updates.role || updates.job_title || updates.jobTitle || existing.position;
    if (pos) {
      updates.position = pos;
      const isRahbar = isXizmatRahbariRole(pos);
      updates.department = isRahbar ? (updates.department || updates.bolim || updates.division || existing.department || null) : null;
    }

    const updated = await updateRow('staff', req.params.id, updates);

    // Kutubxona xodimlar sonini yangilash
    const libId = updated?.libraryId || updated?.library_id || existing?.libraryId || existing?.library_id;
    if (libId) {
      try {
        const countRes = await query('SELECT COUNT(*) as count FROM staff WHERE library_id = ?', [libId]);
        const newCount = parseInt(countRes.rows[0]?.count || 0, 10);
        await query('UPDATE libraries SET staff_count = ? WHERE id = ?', [newCount, libId]);
      } catch {}
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/staff/:id - Xodimni o'chirish
staffRouter.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!ALLOWED_STAFF_MANAGERS.includes(req.user.role)) {
      return res.status(403).json({ error: "Xodimlarni o'chirish uchun ruxsat berilmagan" });
    }

    const existing = await getById('staff', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Xodim topilmadi' });

    const success = await deleteRow('staff', req.params.id);
    if (!success) return res.status(404).json({ error: 'Topilmadi' });

    const libId = existing?.libraryId || existing?.library_id;
    if (libId) {
      try {
        const countRes = await query('SELECT COUNT(*) as count FROM staff WHERE library_id = ?', [libId]);
        const newCount = parseInt(countRes.rows[0]?.count || 0, 10);
        await query('UPDATE libraries SET staff_count = ? WHERE id = ?', [newCount, libId]);
      } catch {}
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default staffRouter;

