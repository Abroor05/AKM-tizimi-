// ============================================================
// DATABASE - SQLite connection & schema
// ============================================================
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'kbt.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- SCHEMA ---
const SCHEMA = `
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  viloyat_id TEXT,
  tuman_id TEXT,
  library_id TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT,
  last_login TEXT
);

-- LIBRARIES
CREATE TABLE IF NOT EXISTS libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  viloyat_id TEXT,
  tuman_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  staff_count INTEGER DEFAULT 0,
  founding_year INTEGER,
  status TEXT DEFAULT 'active',
  created_at TEXT
);

-- BOOKS
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  category TEXT,
  isbn TEXT,
  publisher TEXT,
  year INTEGER,
  copies_total INTEGER DEFAULT 1,
  copies_available INTEGER DEFAULT 1,
  library_id TEXT,
  language TEXT,
  pages INTEGER,
  status TEXT DEFAULT 'available',
  created_at TEXT
);

-- READERS
CREATE TABLE IF NOT EXISTS readers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  card_number TEXT,
  phone TEXT,
  address TEXT,
  birth_year INTEGER,
  library_id TEXT,
  status TEXT DEFAULT 'active',
  registered_at TEXT,
  borrowed_count INTEGER DEFAULT 0,
  last_visit TEXT
);

-- ACTIVITIES
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  library_id TEXT,
  user_id TEXT,
  reader_id TEXT,
  book_id TEXT,
  description TEXT,
  date TEXT,
  time TEXT,
  status TEXT DEFAULT 'completed'
);

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT,
  library_id TEXT,
  user_id TEXT,
  viloyat_id TEXT,
  tuman_id TEXT,
  status TEXT DEFAULT 'draft',
  period TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_comment TEXT,
  data TEXT,
  description TEXT,
  created_at TEXT
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_by TEXT,
  assigned_to TEXT,
  library_id TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date TEXT,
  created_at TEXT,
  completed_at TEXT
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  library_id TEXT,
  viloyat_id TEXT,
  tuman_id TEXT,
  date TEXT,
  time TEXT,
  location TEXT,
  participants INTEGER DEFAULT 0,
  description TEXT,
  organizer TEXT,
  status TEXT DEFAULT 'upcoming'
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  library_id TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER,
  status TEXT DEFAULT 'good',
  purchase_date TEXT,
  serial_number TEXT
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  library_id TEXT,
  uploaded_by TEXT,
  date TEXT,
  file_format TEXT,
  size TEXT,
  description TEXT
);

-- APPEALS
CREATE TABLE IF NOT EXISTS appeals (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  library_id TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  date TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution TEXT
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT,
  title TEXT,
  message TEXT,
  target_role TEXT,
  target_user_id TEXT,
  date TEXT,
  time TEXT,
  read INTEGER DEFAULT 0
);

-- KPI DATA
CREATE TABLE IF NOT EXISTS kpi_data (
  id TEXT PRIMARY KEY,
  library_id TEXT,
  category TEXT,
  metric TEXT,
  target REAL,
  actual REAL,
  unit TEXT,
  period TEXT
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  module TEXT,
  details TEXT,
  ip_address TEXT,
  timestamp TEXT
);

-- SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

// --- Execute schema ---
db.exec(SCHEMA);

// ============================================================
// HELPER: Row <-> Object conversion
// ============================================================

// JSON fields that need parsing when reading from DB
const JSON_FIELDS = {
  reports: ['data'],
};

// Convert DB row to JS object (camelCase + JSON parse)
export function rowToObject(table, row) {
  if (!row) return null;
  const obj = {};
  for (const [key, value] of Object.entries(row)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    // Parse JSON fields
    const jsonFields = JSON_FIELDS[table] || [];
    if (jsonFields.includes(key) && value) {
      try { obj[camelKey] = JSON.parse(value); } catch { obj[camelKey] = value; }
    } else if (key === 'active' || key === 'read') {
      obj[camelKey] = value === 1;
    } else {
      obj[camelKey] = value;
    }
  }
  return obj;
}

// Convert JS object to DB fields (snake_case + JSON stringify)
export function objectToRow(table, obj) {
  const row = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    // Stringify JSON fields
    const jsonFields = JSON_FIELDS[table] || [];
    if (jsonFields.includes(snakeKey) && typeof value === 'object') {
      row[snakeKey] = JSON.stringify(value);
    } else if (key === 'active' || key === 'read') {
      row[snakeKey] = value ? 1 : 0;
    } else {
      row[snakeKey] = value;
    }
  }
  return row;
}

// ============================================================
// GENERIC QUERY HELPERS
// ============================================================

export function getAll(table, where = '', params = []) {
  const sql = where
    ? `SELECT * FROM ${table} WHERE ${where}`
    : `SELECT * FROM ${table}`;
  const rows = db.prepare(sql).all(...params);
  return rows.map(r => rowToObject(table, r));
}

export function getById(table, id) {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  return rowToObject(table, row);
}

export function insertRow(table, obj) {
  const row = objectToRow(table, obj);
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => row[k]);
  db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  return getById(table, obj.id);
}

export function updateRow(table, id, updates) {
  const row = objectToRow(table, updates);
  delete row.id; // Don't update ID
  const keys = Object.keys(row);
  if (keys.length === 0) return getById(table, id);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => row[k]);
  db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, id);
  return getById(table, id);
}

export function deleteRow(table, id) {
  const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return defaultValue;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

export function setSetting(key, value) {
  const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, val);
}

// Check if database has been seeded
export function isSeeded() {
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
  return row.count > 0;
}

export default db;
