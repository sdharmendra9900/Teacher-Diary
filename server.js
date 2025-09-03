// server.js - Express API for Teacher Daily Diary
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const db = new Database('./database.sqlite');
const app = express();
const upload = multer();

app.use(helmet());
app.use(cors());
app.use(express.json({limit: '1mb'}));

// Simple JWT secret for demo (in production use env var)
const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_secure_secret';
const TOKEN_EXP = '7d';

// Helper functions
function genToken(payload){ return require('jsonwebtoken').sign(payload, JWT_SECRET, {expiresIn: TOKEN_EXP}); }
function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'no token'});
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).json({error:'malformed token'});
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch(e){ return res.status(401).json({error:'invalid token'}); }
}

// Routes
app.get('/', (req,res) => res.json({status:'teacher-diary api'}));

// Register
app.post('/api/register', async (req,res) => {
  const {username, password, email} = req.body;
  if(!username || !password) return res.status(400).json({error:'username and password required'});
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if(exists) return res.status(400).json({error:'username exists'});
  const hash = await bcrypt.hash(password, 10);
  const stmt = db.prepare('INSERT INTO users (username,password_hash,email) VALUES (?,?,?)');
  const info = stmt.run(username, hash, email||null);
  const token = genToken({id: info.lastInsertRowid, username});
  res.json({token, username, id: info.lastInsertRowid});
});

// Login
app.post('/api/login', async (req,res) => {
  const {username, password} = req.body;
  if(!username || !password) return res.status(400).json({error:'username/password required'});
  const user = db.prepare('SELECT id, password_hash, is_admin FROM users WHERE username=?').get(username);
  if(!user) return res.status(400).json({error:'invalid credentials'});
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(400).json({error:'invalid credentials'});
  const token = genToken({id: user.id, username, is_admin: !!user.is_admin});
  res.json({token, username, id: user.id, is_admin: !!user.is_admin});
});

// Profile save/load
app.post('/api/profile', authMiddleware, (req,res) => {
  const uid = req.user.id;
  const {name, subject, email, school, academicYear} = req.body;
  const exists = db.prepare('SELECT user_id FROM profiles WHERE user_id=?').get(uid);
  if(exists){
    db.prepare('UPDATE profiles SET name=?, subject=?, email=?, school=?, academic_year=? WHERE user_id=?')
      .run(name, subject, email, school, academicYear, uid);
  } else {
    db.prepare('INSERT INTO profiles (user_id,name,subject,email,school,academic_year) VALUES (?,?,?,?,?,?)')
      .run(uid, name, subject, email, school, academicYear);
  }
  res.json({ok:true});
});

app.get('/api/profile', authMiddleware, (req,res) => {
  const uid = req.user.id;
  const p = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(uid);
  res.json(p || {});
});

// Entries CRUD
app.post('/api/entry', authMiddleware, (req,res) => {
  const uid = req.user.id;
  const e = req.body;
  // Upsert by unique (user_id,date,class_section,period)
  const existing = db.prepare('SELECT id FROM entries WHERE user_id=? AND date=? AND class_section=? AND period=?')
    .get(uid, e.date, e.class_section || e.class, e.period);
  if(existing){
    const fields = ['subject','topic','remarks','strength','present','absent','late','sick','od','nr','other','ts'];
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => e[f] ?? e[f] === 0 ? e[f] : null);
    values.push(uid, e.date, e.class_section || e.class, e.period);
    db.prepare(`UPDATE entries SET ${sets} WHERE user_id=? AND date=? AND class_section=? AND period=?`).run(...values);
    return res.json({ok:true, updated:true});
  } else {
    const stmt = db.prepare(`INSERT INTO entries (user_id,date,class_section,period,subject,topic,remarks,strength,present,absent,late,sick,od,nr,other,ts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const info = stmt.run(uid, e.date, e.class_section || e.class, e.period, e.subject, e.topic, e.remarks || '', e.strength||0, e.present||0, e.absent||0, e.late||0, e.sick||0, e.od||0, e.nr||0, e.other||0, e.ts || Date.now());
    return res.json({ok:true, insertedId: info.lastInsertRowid});
  }
});

app.get('/api/entries', authMiddleware, (req,res) => {
  const uid = req.user.id;
  const rows = db.prepare('SELECT * FROM entries WHERE user_id=? ORDER BY ts DESC').all(uid);
  res.json(rows);
});

app.delete('/api/entry/:id', authMiddleware, (req,res) => {
  const uid = req.user.id;
  const id = Number(req.params.id);
  db.prepare('DELETE FROM entries WHERE id=? AND user_id=?').run(id, uid);
  res.json({ok:true});
});

// Admin routes
function requireAdmin(req,res,next){
  if(!req.user || !req.user.is_admin) return res.status(403).json({error:'admin only'});
  next();
}

app.get('/api/admin/users', authMiddleware, requireAdmin, (req,res) => {
  const users = db.prepare('SELECT id,username,email,is_admin,created_at FROM users').all();
  res.json(users);
});

app.get('/api/admin/export', authMiddleware, requireAdmin, (req,res) => {
  // export all users, profiles, entries
  const users = db.prepare('SELECT id,username,email,is_admin,created_at FROM users').all();
  const profiles = db.prepare('SELECT * FROM profiles').all();
  const entries = db.prepare('SELECT * FROM entries').all();
  res.json({users, profiles, entries});
});

// Simple file upload (not used by client, but future-proof)
app.post('/api/upload', authMiddleware, upload.single('file'), (req,res) => {
  if(!req.file) return res.status(400).json({error:'no file'});
  // store file bytes to disk (basic)
  const fname = `uploads/${Date.now()}_${req.file.originalname}`;
  const fs = require('fs');
  fs.writeFileSync(fname, req.file.buffer);
  res.json({ok:true, path: fname});
});

// Start server
const PORT = process.env.PORT || 7842;
app.listen(PORT, () => console.log('Server running on port', PORT));
