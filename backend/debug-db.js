// ============================================================
// DEBUG DB - PostgreSQL status & sample data inspector
// ============================================================
import { query, pool } from './src/db/database.js';

async function main() {
  console.log('\n========================================');
  console.log('  POSTGRESQL BAZASI HOLATI (akm_db)');
  console.log('========================================\n');

  const usersRes = await query('SELECT id, username, full_name, role, library_id, viloyat_id, tuman_id, active FROM users');
  console.log('USERS:');
  console.log(JSON.stringify(usersRes.rows, null, 2));

  const libRes = await query('SELECT id, name, viloyat_id, tuman_id FROM libraries LIMIT 10');
  console.log('\nLIBRARIES (birinchi 10 ta):');
  console.log(JSON.stringify(libRes.rows, null, 2));

  const [readers, books, activities, reports, tasks, notifs, audit] = await Promise.all([
    query('SELECT COUNT(*) as c FROM readers'),
    query('SELECT COUNT(*) as c FROM books'),
    query('SELECT COUNT(*) as c FROM activities'),
    query('SELECT COUNT(*) as c FROM reports'),
    query('SELECT COUNT(*) as c FROM tasks'),
    query('SELECT COUNT(*) as c FROM notifications'),
    query('SELECT COUNT(*) as c FROM audit_log'),
  ]);

  console.log('\nSTATISTIKA:');
  console.log(`- Foydalanuvchilar: ${usersRes.rows.length}`);
  console.log(`- Kutubxonalar:     ${libRes.rows.length}`);
  console.log(`- Kitobxonlar:      ${readers.rows[0].c}`);
  console.log(`- Kitoblar:         ${books.rows[0].c}`);
  console.log(`- Faoliyatlar:      ${activities.rows[0].c}`);
  console.log(`- Hisobotlar:       ${reports.rows[0].c}`);
  console.log(`- Topshiriqlar:     ${tasks.rows[0].c}`);
  console.log(`- Bildirishnomalar: ${notifs.rows[0].c}`);
  console.log(`- Audit yozuvlari:  ${audit.rows[0].c}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Xatolik:', err);
  process.exit(1);
});
