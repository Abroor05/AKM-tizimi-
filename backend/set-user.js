// ============================================================
// SET USER - Parollarni tiklash va yangilash (PostgreSQL)
// ============================================================
import bcrypt from 'bcryptjs';
import { query, pool } from './src/db/database.js';

const defaultPass = bcrypt.hashSync('admin123', 10);

async function main() {
  console.log('\n========================================');
  console.log('  Foydalanuvchi parollarini yangilash');
  console.log('========================================\n');

  // Ensure viloyat_admin user exists
  const viloyatRes = await query("SELECT * FROM users WHERE username = 'viloyat'");
  if (viloyatRes.rows.length === 0) {
    await query(`
      INSERT INTO users (id, username, password_hash, full_name, role, phone, email, viloyat_id, tuman_id, library_id, active, created_at)
      VALUES ('u_viloyat_01', 'viloyat', ?, 'Farg''ona Viloyat Admini', 'viloyat_admin', '+998901234567', 'viloyat@akm.uz', 'v01', NULL, NULL, 1, '2026-10-13')
    `, [defaultPass]);
    console.log('Viloyat admin foydalanuvchisi yaratildi: viloyat / admin123');
  } else {
    await query("UPDATE users SET password_hash = ? WHERE username = 'viloyat'", [defaultPass]);
    console.log('Viloyat admin paroli yangilandi: viloyat / admin123');
  }

  // Make sure admin, bobur, tester, test have admin123
  await query("UPDATE users SET password_hash = ? WHERE username IN ('admin', 'bobur', 'tester', 'test')", [defaultPass]);
  console.log('Asosiy foydalanuvchilar paroli tekshirildi (admin123).');

  const usersRes = await query("SELECT id, username, role, full_name, viloyat_id, tuman_id FROM users");
  console.log('\nMavjud foydalanuvchilar:');
  console.table(usersRes.rows);

  await pool.end();
}

main().catch((err) => {
  console.error('Xatolik:', err);
  process.exit(1);
});
