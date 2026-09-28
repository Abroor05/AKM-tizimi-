const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./src/data/kbt.db');
const password = 'Xodim123!';
const resolved = db.prepare("SELECT id FROM libraries WHERE viloyat_id = 'v01' AND tuman_id = 't0113' LIMIT 1").get();
db.prepare("UPDATE users SET password_hash = ?, library_id = COALESCE(library_id, ?) WHERE username = 'sanjar'").run(bcrypt.hashSync(password, 10), resolved ? resolved.id : null);
console.log(JSON.stringify(db.prepare("SELECT username, role, library_id, viloyat_id, tuman_id FROM users WHERE username = 'sanjar'").all(), null, 2));
