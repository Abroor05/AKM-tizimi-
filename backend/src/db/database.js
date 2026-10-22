// ============================================================
// DATABASE - PostgreSQL connection & schema
// ============================================================
import pg from 'pg';

const { Pool } = pg;

// .env konfiguratsiyasini yuklash (agar yuklanmagan bo'lsa)
try {
  process.loadEnvFile();
} catch {
  // .env mavjud bo'lmasa, default sozlamalar ishlaydi
}

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'akm_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

export const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Xatosi]', err);
});

// Helper: ? parametr belgilarini PostgreSQL $1, $2, ... belgilariga aylantirish
export function toPgSql(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Barcha so'rovlar uchun yagona xavfsiz wrapper
export async function query(sql, params = []) {
  const pgSql = toPgSql(sql);
  return pool.query(pgSql, params);
}

export async function getOne(sql, params = []) {
  const res = await query(sql, params);
  return res.rows[0] || null;
}

export async function getMany(sql, params = []) {
  const res = await query(sql, params);
  return res.rows;
}

export async function execute(sql, params = []) {
  const res = await query(sql, params);
  return { changes: res.rowCount, rowCount: res.rowCount };
}

// SQLite prepare() interfeysi bilan moslik (backward compatibility)
export const db = {
  pool,
  query,
  exec: async (sql) => pool.query(sql),
  prepare: (sql) => ({
    get: async (...params) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const res = await query(sql, flatParams);
      return res.rows[0] || null;
    },
    all: async (...params) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const res = await query(sql, flatParams);
      return res.rows;
    },
    run: async (...params) => {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const res = await query(sql, flatParams);
      return { changes: res.rowCount, rowCount: res.rowCount };
    },
  }),
};

// --- SCHEMA & TABLES INITIALIZATION ---
export async function initDb() {
  const SCHEMA = `
  -- USERS
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    viloyat_id VARCHAR(100),
    tuman_id VARCHAR(100),
    library_id VARCHAR(100),
    active INTEGER DEFAULT 1,
    created_at TEXT,
    last_login TEXT
  );

  -- LIBRARIES
  CREATE TABLE IF NOT EXISTS libraries (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT NOT NULL,
    type VARCHAR(100),
    viloyat_id VARCHAR(100),
    tuman_id VARCHAR(100),
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone VARCHAR(50),
    email VARCHAR(255),
    staff_count INTEGER DEFAULT 0,
    founding_year INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TEXT
  );

  -- BOOKS
  CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    category VARCHAR(100),
    isbn VARCHAR(100),
    publisher TEXT,
    year INTEGER,
    copies_total INTEGER DEFAULT 1,
    copies_available INTEGER DEFAULT 1,
    library_id VARCHAR(100),
    language VARCHAR(50),
    pages INTEGER,
    status VARCHAR(50) DEFAULT 'available',
    created_at TEXT
  );

  -- READERS
  CREATE TABLE IF NOT EXISTS readers (
    id VARCHAR(255) PRIMARY KEY,
    full_name TEXT NOT NULL,
    card_number VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    birth_year INTEGER,
    birth_date TEXT,
    library_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    registered_at TEXT,
    borrowed_count INTEGER DEFAULT 0,
    last_visit TEXT,
    created_at TEXT
  );

  -- ACTIVITIES
  CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    library_id VARCHAR(100),
    user_id VARCHAR(100),
    count INTEGER,
    data TEXT,
    description TEXT,
    date TEXT,
    time TEXT,
    status VARCHAR(50) DEFAULT 'completed'
  );

  -- REPORTS
  CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    title TEXT,
    library_id VARCHAR(100),
    user_id VARCHAR(100),
    viloyat_id VARCHAR(100),
    tuman_id VARCHAR(100),
    target_role VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    period VARCHAR(50),
    submitted_at TEXT,
    reviewed_at TEXT,
    reviewed_by VARCHAR(100),
    review_comment TEXT,
    data TEXT,
    description TEXT,
    created_at TEXT
  );

  -- TASKS
  CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_by VARCHAR(100),
    assigned_to VARCHAR(100),
    library_id VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    due_date TEXT,
    created_at TEXT,
    completed_at TEXT
  );

  -- EVENTS
  CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    type VARCHAR(100),
    library_id VARCHAR(100),
    viloyat_id VARCHAR(100),
    tuman_id VARCHAR(100),
    target_scope VARCHAR(100),
    target_tumans TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    participants INTEGER DEFAULT 0,
    description TEXT,
    organizer TEXT,
    status VARCHAR(50) DEFAULT 'upcoming'
  );

  -- INVENTORY
  CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(255) PRIMARY KEY,
    name TEXT NOT NULL,
    type VARCHAR(100),
    library_id VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC,
    status VARCHAR(50) DEFAULT 'good',
    purchase_date TEXT,
    serial_number VARCHAR(100)
  );

  -- DOCUMENTS
  CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    type VARCHAR(100),
    library_id VARCHAR(100),
    uploaded_by VARCHAR(100),
    date TEXT,
    file_format VARCHAR(50),
    size VARCHAR(50),
    description TEXT
  );

  -- APPEALS
  CREATE TABLE IF NOT EXISTS appeals (
    id VARCHAR(255) PRIMARY KEY,
    full_name TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    library_id VARCHAR(100),
    subject TEXT,
    message TEXT,
    status VARCHAR(50) DEFAULT 'new',
    date TEXT,
    resolved_at TEXT,
    resolved_by VARCHAR(100),
    resolution TEXT
  );

  -- NOTIFICATIONS
  CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100),
    title TEXT,
    message TEXT,
    target_role VARCHAR(100),
    target_user_id VARCHAR(100),
    date TEXT,
    time TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT
  );

  -- KPI DATA
  CREATE TABLE IF NOT EXISTS kpi_data (
    id VARCHAR(255) PRIMARY KEY,
    library_id VARCHAR(100),
    category VARCHAR(100),
    metric VARCHAR(100),
    target DOUBLE PRECISION,
    actual DOUBLE PRECISION,
    unit VARCHAR(50),
    period VARCHAR(50)
  );

  -- AUDIT LOG
  CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(100),
    action VARCHAR(100),
    module VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TEXT
  );

  -- SETTINGS
  CREATE TABLE IF NOT EXISTS settings (
    "key" VARCHAR(255) PRIMARY KEY,
    value TEXT
  );

  -- PERFORMANCE INDEXES
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_library_id ON users(library_id);
  CREATE INDEX IF NOT EXISTS idx_libraries_viloyat_tuman ON libraries(viloyat_id, tuman_id);
  CREATE INDEX IF NOT EXISTS idx_reports_library_id ON reports(library_id);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_activities_library_id ON activities(library_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(target_user_id, target_role, read);
  CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
  `;

  await pool.query(SCHEMA);
  await refreshColumnsCache();
}

// Cache table columns
let columnsCache = null;

export async function refreshColumnsCache() {
  const res = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const cache = {};
  for (const row of res.rows) {
    if (!cache[row.table_name]) cache[row.table_name] = new Set();
    cache[row.table_name].add(row.column_name);
  }
  columnsCache = cache;
  return columnsCache;
}

export async function getTableColumns(tableName) {
  if (!columnsCache) {
    await refreshColumnsCache();
  }
  return columnsCache[tableName] || new Set();
}

// ============================================================
// HELPER: Row <-> Object conversion
// ============================================================

const JSON_FIELDS = {
  reports: ['data'],
  events: ['target_tumans'],
  activities: ['data'],
};

export function rowToObject(table, row) {
  if (!row) return null;
  const obj = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const jsonFields = JSON_FIELDS[table] || [];
    if (jsonFields.includes(key) && value) {
      try {
        obj[camelKey] = typeof value === 'object' ? value : JSON.parse(value);
      } catch {
        obj[camelKey] = value;
      }
    } else if (key === 'active' || key === 'read') {
      obj[camelKey] = value === 1 || value === true;
    } else {
      obj[camelKey] = value;
    }
  }
  return obj;
}

const NUMERIC_COLUMNS = new Set([
  'latitude', 'longitude', 'staff_count', 'founding_year',
  'copies_total', 'copies_available', 'year', 'pages',
  'birth_year', 'borrowed_count', 'count', 'participants',
  'quantity', 'unit_price', 'target', 'actual', 'read', 'active'
]);

export function objectToRow(table, obj) {
  const row = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    const jsonFields = JSON_FIELDS[table] || [];

    if (jsonFields.includes(snakeKey) && value !== null && typeof value === 'object') {
      row[snakeKey] = JSON.stringify(value);
    } else if (key === 'active' || key === 'read') {
      row[snakeKey] = value ? 1 : 0;
    } else if (NUMERIC_COLUMNS.has(snakeKey)) {
      if (value === '' || value === null || value === undefined) {
        row[snakeKey] = null;
      } else {
        const num = Number(value);
        row[snakeKey] = isNaN(num) ? null : num;
      }
    } else {
      row[snakeKey] = value;
    }
  }
  return row;
}

// ============================================================
// GENERIC QUERY HELPERS
// ============================================================

export async function resolveUserLibraryId(user) {
  const libraryRoles = ['kutubxona_xodimi', 'xodimlar_boshligi'];
  if (!user || !libraryRoles.includes(user.role)) return user;
  if (user.libraryId || user.library_id) return user;

  const viloyatId = user.viloyatId || user.viloyat_id;
  const tumanId = user.tumanId || user.tuman_id;
  if (!viloyatId || !tumanId) return user;

  const res = await query(
    'SELECT id FROM libraries WHERE viloyat_id = ? AND tuman_id = ? ORDER BY created_at DESC, id ASC LIMIT 1',
    [viloyatId, tumanId]
  );
  let library = res.rows[0];

  if (!library) {
    const libraryId = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const label = tumanId ? `Kutubxona (${tumanId})` : 'Asosiy kutubxona';
    await query(
      'INSERT INTO libraries (id, name, type, viloyat_id, tuman_id, address, phone, email, staff_count, founding_year, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)',
      [libraryId, label, 'district', viloyatId, tumanId, '', '', '', new Date().getFullYear(), 'active', new Date().toISOString()]
    );
    library = { id: libraryId };
  }

  await query('UPDATE users SET library_id = ? WHERE id = ?', [library.id, user.id]);
  return { ...user, libraryId: library.id, library_id: library.id };
}

export async function getAll(table, where = '', params = []) {
  const sql = where
    ? `SELECT * FROM ${table} WHERE ${where}`
    : `SELECT * FROM ${table}`;
  const res = await query(sql, params);
  const items = [];
  for (const r of res.rows) {
    const obj = rowToObject(table, r);
    items.push(table === 'users' ? await resolveUserLibraryId(obj) : obj);
  }
  return items;
}

export async function getById(table, id) {
  const res = await query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  const row = res.rows[0];
  if (!row) return null;
  const obj = rowToObject(table, row);
  return table === 'users' ? await resolveUserLibraryId(obj) : obj;
}

export async function insertRow(table, obj) {
  const row = objectToRow(table, obj);
  const tableColumns = await getTableColumns(table);
  const keys = Object.keys(row).filter((k) => tableColumns.has(k));
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const quotedKeys = keys.map((k) => `"${k}"`).join(', ');
  const values = keys.map((k) => row[k]);
  await pool.query(`INSERT INTO ${table} (${quotedKeys}) VALUES (${placeholders})`, values);
  return await getById(table, obj.id);
}

export async function updateRow(table, id, updates) {
  const row = objectToRow(table, updates);
  delete row.id;
  const tableColumns = await getTableColumns(table);
  const keys = Object.keys(row).filter((k) => tableColumns.has(k));
  if (keys.length === 0) return await getById(table, id);
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = keys.map((k) => row[k]);
  values.push(id);
  await pool.query(`UPDATE ${table} SET ${setClause} WHERE id = $${values.length}`, values);
  return await getById(table, id);
}

export async function deleteRow(table, id) {
  const res = await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return res.rowCount > 0;
}

export async function getSetting(key, defaultValue = null) {
  const res = await query('SELECT value FROM settings WHERE "key" = ?', [key]);
  if (!res.rows[0]) return defaultValue;
  try {
    return JSON.parse(res.rows[0].value);
  } catch {
    return res.rows[0].value;
  }
}

export async function setSetting(key, value) {
  const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await query(
    'INSERT INTO settings ("key", value) VALUES (?, ?) ON CONFLICT ("key") DO UPDATE SET value = EXCLUDED.value',
    [key, val]
  );
}

export async function isSeeded() {
  const res = await query('SELECT COUNT(*) as count FROM users');
  return parseInt(res.rows[0]?.count || 0, 10) > 0;
}

export default db;
