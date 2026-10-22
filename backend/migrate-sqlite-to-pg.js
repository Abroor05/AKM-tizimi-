// ============================================================
// SQLITE -> POSTGRESQL MIGRATION SCRIPT
// SQLite bazasidagi barcha ma'lumotlarni PostgreSQL ga to'liq ko'chirish
// ============================================================
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool, initDb, getTableColumns, objectToRow } from './src/db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SQLITE_PATH = join(__dirname, '..', 'database', 'kbt.db');

async function migrate() {
  console.log('\n========================================');
  console.log('  SQLite -> PostgreSQL Migratsiya');
  console.log('========================================\n');

  // 1. PostgreSQL jadvallarini tayyorlash
  console.log('[1/4] PostgreSQL jadvallarini tekshirish...');
  await initDb();
  console.log('✓ PostgreSQL jadvallari tayyor.\n');

  // 2. SQLite bazasini ochish
  console.log(`[2/4] SQLite bazasi ochilmoqda: ${SQLITE_PATH}`);
  let sqliteDb;
  try {
    sqliteDb = new Database(SQLITE_PATH);
  } catch (err) {
    console.error('SQLite faylini ochishda xatolik:', err.message);
    process.exit(1);
  }

  // Ko'chirilishi kerak bo'lgan jadvallar tartibi (foreign keys va dependency hisobga olingan)
  const tables = [
    'libraries',
    'users',
    'books',
    'readers',
    'activities',
    'reports',
    'tasks',
    'events',
    'inventory',
    'documents',
    'appeals',
    'notifications',
    'kpi_data',
    'audit_log',
    'settings',
  ];

  console.log('\n[3/4] Ma\'lumotlarni ko\'chirish...');
  let totalMigrated = 0;

  for (const table of tables) {
    // SQLite da jadval bor-yo'qligini tekshirish
    const exists = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table);
    if (!exists) {
      console.log(`  - ${table}: SQLite da topilmadi (o'tkazib yuborildi)`);
      continue;
    }

    const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`  - ${table}: 0 ta yozuv (bo'sh)`);
      continue;
    }

    const pgCols = await getTableColumns(table);
    const pkColumn = table === 'settings' ? 'key' : 'id';

    let migratedCount = 0;
    for (const rawRow of rows) {
      const sanitized = objectToRow(table, rawRow);
      const keys = Object.keys(sanitized).filter((k) => pgCols.has(k));
      if (keys.length === 0) continue;

      const quotedKeys = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => sanitized[k]);

      // ON CONFLICT DO UPDATE yoki DO NOTHING
      const updateClause = keys
        .filter((k) => k !== pkColumn)
        .map((k) => `"${k}" = EXCLUDED."${k}"`)
        .join(', ');

      const conflictSql = updateClause
        ? `ON CONFLICT ("${pkColumn}") DO UPDATE SET ${updateClause}`
        : `ON CONFLICT ("${pkColumn}") DO NOTHING`;

      const insertSql = `INSERT INTO ${table} (${quotedKeys}) VALUES (${placeholders}) ${conflictSql}`;
      try {
        await pool.query(insertSql, values);
        migratedCount++;
      } catch (err) {
        console.error(`    Xatolik [${table}]:`, err.message);
      }
    }

    console.log(`  ✓ ${table}: ${migratedCount} / ${rows.length} ta yozuv PostgreSQL ga muvaffaqiyatli ko'chirildi`);
    totalMigrated += migratedCount;
  }

  console.log(`\n[4/4] Natija: Jami ${totalMigrated} ta yozuv PostgreSQL bazasiga o'tkazildi!`);
  console.log('========================================\n');

  sqliteDb.close();
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migratsiyada jiddiy xatolik yuz berdi:', err);
  process.exit(1);
});
