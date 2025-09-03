// migrate.js - initialize SQLite database and seed an admin user
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('./database.sqlite');

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  name TEXT, subject TEXT, school TEXT, academic_year TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT,
  class_section TEXT,
  period TEXT,
  subject TEXT,
  topic TEXT,
  remarks TEXT,
  strength INTEGER,
  present INTEGER,
  absent INTEGER,
  late INTEGER,
  sick INTEGER,
  od INTEGER,
  nr INTEGER,
  other INTEGER,
  ts INTEGER,
  UNIQUE(user_id, date, class_section, period),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

const adminUser = 'admin1';
const adminPass = 'admin123';
const saltRounds = 10;
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser);
if(!existing){
  const hash = bcrypt.hashSync(adminPass, saltRounds);
  const stmt = db.prepare('INSERT INTO users (username, password_hash, email, is_admin) VALUES (?, ?, ?, 1)');
  stmt.run(adminUser, hash, 'admin@example.com');
  console.log('Seeded admin user:', adminUser, 'password:', adminPass);
} else {
  console.log('Admin user already exists.');
}
db.close();
