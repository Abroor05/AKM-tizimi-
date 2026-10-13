const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'database', 'kbt.db'));

const defaultPass = bcrypt.hashSync('admin123', 10);

// Ensure viloyat_admin user exists
const viloyatUser = db.prepare("SELECT * FROM users WHERE username = 'viloyat'").get();
if (!viloyatUser) {
  db.prepare(`
    INSERT INTO users (id, username, password_hash, full_name, role, phone, email, viloyat_id, tuman_id, library_id, active, created_at)
    VALUES ('u_viloyat_01', 'viloyat', ?, 'Farg''ona Viloyat Admini', 'viloyat_admin', '+998901234567', 'viloyat@akm.uz', 'v01', NULL, NULL, 1, '2026-10-13')
  `).run(defaultPass);
  console.log('Viloyat admin user created: viloyat / admin123');
} else {
  db.prepare("UPDATE users SET password_hash = ? WHERE username = 'viloyat'").run(defaultPass);
  console.log('Viloyat admin password updated: viloyat / admin123');
}

// Make sure tester & bobur also have admin123
db.prepare("UPDATE users SET password_hash = ? WHERE username IN ('bobur', 'tester', 'admin')").run(defaultPass);

console.log('Current users:');
console.log(db.prepare("SELECT id, username, role, full_name, viloyat_id, tuman_id FROM users").all());
