// ============================================================
// SCOPE & ACCESS CONTROL HELPERS (Viloyat / Tuman Isolation)
// ============================================================
import { query } from '../db/database.js';

export function isSuperAdmin(user) {
  const role = (user?.role || '').toLowerCase();
  return role === 'super_admin' || role === 'superadmin';
}

export function isViloyatAdmin(user) {
  return (user?.role || '').toLowerCase() === 'viloyat_admin';
}

export function isDistrictScopedRole(user) {
  const role = (user?.role || '').toLowerCase();
  return ['tuman_admin', 'direktor', 'xodimlar_boshligi', 'kutubxona_xodimi'].includes(role);
}

export async function getScopeContext(user) {
  const viloyatId = user?.viloyatId || user?.viloyat_id || '';
  const tumanId = user?.tumanId || user?.tuman_id || '';
  const libraryId = user?.libraryId || user?.library_id || '';

  if (isSuperAdmin(user)) {
    return {
      isSuperAdmin: true,
      isViloyatAdmin: false,
      isDistrictScoped: false,
      viloyatId,
      tumanId,
      libraryId,
      allowedLibraryIds: null,
      allowedUserIds: null,
    };
  }

  const allowedLibraryIds = new Set();
  if (libraryId) allowedLibraryIds.add(libraryId);

  const allowedUserIds = new Set();
  if (user?.id) allowedUserIds.add(user.id);

  if (isViloyatAdmin(user)) {
    if (viloyatId) {
      const libRes = await query('SELECT id FROM libraries WHERE viloyat_id = ?', [viloyatId]);
      for (const r of libRes.rows) allowedLibraryIds.add(r.id);

      const usrRes = await query('SELECT id FROM users WHERE viloyat_id = ?', [viloyatId]);
      for (const r of usrRes.rows) allowedUserIds.add(r.id);
    }
    return {
      isSuperAdmin: false,
      isViloyatAdmin: true,
      isDistrictScoped: false,
      viloyatId,
      tumanId,
      libraryId,
      allowedLibraryIds,
      allowedUserIds,
    };
  }

  // District-scoped roles: tuman_admin, direktor, xodimlar_boshligi, kutubxona_xodimi
  if (tumanId) {
    const libSql = viloyatId
      ? 'SELECT id FROM libraries WHERE viloyat_id = ? AND tuman_id = ?'
      : 'SELECT id FROM libraries WHERE tuman_id = ?';
    const libParams = viloyatId ? [viloyatId, tumanId] : [tumanId];
    const libRes = await query(libSql, libParams);
    for (const r of libRes.rows) allowedLibraryIds.add(r.id);

    const usrSql = viloyatId
      ? 'SELECT id FROM users WHERE viloyat_id = ? AND tuman_id = ?'
      : 'SELECT id FROM users WHERE tuman_id = ?';
    const usrRes = await query(usrSql, libParams);
    for (const r of usrRes.rows) allowedUserIds.add(r.id);
  } else if (libraryId) {
    const usrRes = await query('SELECT id FROM users WHERE library_id = ?', [libraryId]);
    for (const r of usrRes.rows) allowedUserIds.add(r.id);
  }

  return {
    isSuperAdmin: false,
    isViloyatAdmin: false,
    isDistrictScoped: true,
    viloyatId,
    tumanId,
    libraryId,
    allowedLibraryIds,
    allowedUserIds,
  };
}

function getItemViloyat(item) {
  return item?.viloyatId || item?.viloyat_id || '';
}

function getItemTuman(item) {
  return item?.tumanId || item?.tuman_id || '';
}

function getItemLib(item) {
  return item?.libraryId || item?.library_id || '';
}

function getItemUser(item) {
  return item?.userId || item?.user_id || item?.createdBy || item?.created_by || '';
}

export function canAccessItem(tableName, item, user, ctx) {
  if (!item) return false;
  if (ctx.isSuperAdmin) return true;

  const itemViloyat = getItemViloyat(item);
  const itemTuman = getItemTuman(item);
  const itemLib = getItemLib(item);
  const itemUser = getItemUser(item);

  if (ctx.isViloyatAdmin) {
    if (tableName === 'users') {
      return Boolean(ctx.viloyatId && itemViloyat === ctx.viloyatId);
    }
    if (tableName === 'libraries') {
      return Boolean(ctx.viloyatId && itemViloyat === ctx.viloyatId);
    }
    if (tableName === 'reports') {
      if (itemViloyat && itemViloyat === ctx.viloyatId) return true;
      if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
      if (itemUser && ctx.allowedUserIds.has(itemUser)) return true;
      if (!itemViloyat && item.targetRole && String(item.targetRole).includes('viloyat_admin')) return true;
      return false;
    }
    if (tableName === 'tasks') {
      if (item.assignedTo === user.id || item.assignedBy === user.id) return true;
      if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
      if (item.assignedTo && ctx.allowedUserIds.has(item.assignedTo)) return true;
      if (item.assignedBy && ctx.allowedUserIds.has(item.assignedBy)) return true;
      return false;
    }
    if (tableName === 'events') {
      if (item.organizer === user.id) return true;
      if (item.targetScope === 'self') return Boolean(itemViloyat && itemViloyat === ctx.viloyatId);
      if (!itemViloyat || itemViloyat === ctx.viloyatId) return true;
      return Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
    }
    if (itemViloyat && itemViloyat === ctx.viloyatId) return true;
    if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
    if (itemUser && ctx.allowedUserIds.has(itemUser)) return true;
    return false;
  }

  // District-scoped roles: tuman_admin, direktor, xodimlar_boshligi, kutubxona_xodimi
  const matchesDistrict =
    Boolean(ctx.tumanId && itemTuman === ctx.tumanId && (!itemViloyat || !ctx.viloyatId || itemViloyat === ctx.viloyatId));

  if (tableName === 'libraries') {
    if (matchesDistrict) return true;
    return Boolean(ctx.libraryId && item.id === ctx.libraryId);
  }

  if (tableName === 'users') {
    return matchesDistrict || Boolean(ctx.libraryId && itemLib === ctx.libraryId);
  }

  if (tableName === 'staff') {
    if (matchesDistrict) return true;
    return Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
  }

  if (tableName === 'activities') {
    if (itemUser === user.id) return true;
    if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
    if (itemUser && ctx.allowedUserIds.has(itemUser)) return true;
    return false;
  }

  if (tableName === 'reports') {
    if (itemUser === user.id) return true;
    if (matchesDistrict) return true;
    if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
    if (itemUser && ctx.allowedUserIds.has(itemUser)) return true;
    return false;
  }

  if (tableName === 'tasks') {
    const role = (user?.role || '').toLowerCase();
    if (role === 'kutubxona_xodimi') {
      return item.assignedTo === user.id || item.assignedBy === user.id;
    }
    if (item.assignedTo === user.id || item.assignedBy === user.id) return true;
    if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
    if (item.assignedTo && ctx.allowedUserIds.has(item.assignedTo)) return true;
    if (item.assignedBy && ctx.allowedUserIds.has(item.assignedBy)) return true;
    return false;
  }

  if (tableName === 'events') {
    if (item.organizer === user.id) return true;
    if (item.targetScope === 'self' || item.targetScope === 'own_tuman') {
      return matchesDistrict || Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
    }
    const sameViloyat = !itemViloyat || !ctx.viloyatId || itemViloyat === ctx.viloyatId;
    if (sameViloyat) {
      if (item.targetScope === 'all_tumans') return true;
      if (item.targetScope === 'selected_tumans') {
        let list = item.targetTumans;
        if (typeof list === 'string') {
          try { list = JSON.parse(list); } catch { list = []; }
        }
        if (Array.isArray(list) && ctx.tumanId && list.includes(ctx.tumanId)) return true;
      }
      if (matchesDistrict) return true;
    }
    return Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
  }

  if (tableName === 'inventory') {
    if (matchesDistrict) return true;
    return Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
  }

  if (tableName === 'documents') {
    if (item.uploadedBy === user.id) return true;
    if (itemLib && ctx.allowedLibraryIds.has(itemLib)) return true;
    if (item.uploadedBy && ctx.allowedUserIds.has(item.uploadedBy)) return true;
    return false;
  }

  if (tableName === 'appeals' || tableName === 'kpi_data' || tableName === 'books' || tableName === 'readers') {
    return Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
  }

  return matchesDistrict || Boolean(itemLib && ctx.allowedLibraryIds.has(itemLib));
}

export function filterByScope(tableName, items, user, ctx) {
  if (!Array.isArray(items)) return [];
  if (ctx.isSuperAdmin) return items;
  return items.filter((item) => canAccessItem(tableName, item, user, ctx));
}

export function canModifyItem(tableName, item, user, ctx) {
  if (!item) return false;
  if (ctx.isSuperAdmin) return true;

  if (!canAccessItem(tableName, item, user, ctx)) return false;

  const role = (user?.role || '').toLowerCase();
  const itemUser = getItemUser(item);

  if (tableName === 'activities') {
    // Xodim o'zining hisobotini (hatto yuborilgan/qabul qilingan bo'lsa ham) tahrirlashi va o'chirishi mumkin.
    // Bo'lim boshlig'i va Direktor o'z tumani / kutubxonasi doirasida tahrirlashi/o'chirishi mumkin.
    if (role === 'kutubxona_xodimi') {
      return itemUser === user.id;
    }
    return true;
  }

  if (tableName === 'reports') {
    if (role === 'kutubxona_xodimi') {
      return itemUser === user.id;
    }
    return true;
  }

  return true;
}
