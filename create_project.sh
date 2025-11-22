#!/bin/bash
# create_project.sh — creates Student PQP Hub project files

set -e

mkdir -p ./public ./uploads ./data

# db.js
cat > db.js <<'JS'
const Database = require('better-sqlite3');
const fs = require('fs');
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
const db = new Database('./data/database.sqlite');

// Users
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// Subjects mapping
db.prepare(`CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grp TEXT,
  year TEXT,
  semester TEXT,
  subject TEXT
)`).run();

// Papers metadata
db.prepare(`CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  grp TEXT,
  year TEXT,
  semester TEXT,
  subject TEXT,
  uploaded_by INTEGER,
  approved INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// Files table
db.prepare(`CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER,
  filename TEXT,
  originalname TEXT,
  filepath TEXT,
  mimetype TEXT
)`).run();

module.exports = db;
JS

# server.js
cat > server.js <<'JS'
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pqp_hub_secret_change_it';

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { grp, year, semester, subject, paperId } = req.body;
    let base = path.join(__dirname, 'uploads', sanitize(grp || 'unknown'));
    base = path.join(base, sanitize(year || 'unknown'));
    if (semester && semester !== 'NA') base = path.join(base, sanitize(semester));
    base = path.join(base, sanitize(subject || 'unknown'));
    base = path.join(base, String(paperId || 'temp'));
    fs.mkdirSync(base, { recursive: true });
    cb(null, base);
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '_' + Math.random().toString(36).slice(2,8) + path.extname(file.originalname);
    cb(null, name);
  }
});
const upload = multer({ storage });

function sanitize(s) { return String(s).replace(/[^a-z0-9-_\\.]/gi, '_'); }

function createToken(user) { return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '30d' }); }

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ ok: false, message: 'No token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ ok: false, message: 'Invalid token' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: 'Token invalid' });
  }
}
function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, message: 'Not auth' });
  if (req.user.role !== 'admin') return res.status(403).json({ ok: false, message: 'Admin only' });
  next();
}

// AUTH
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Email/password required' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ ok: false, message: 'Email exists' });
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run(name || '', email, hash, 'user');
  const user = { id: info.lastInsertRowid, name, email, role: 'user' };
  const token = createToken(user);
  res.json({ ok: true, user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row) return res.status(401).json({ ok: false, message: 'Invalid' });
  const match = await bcrypt.compare(password, row.password);
  if (!match) return res.status(401).json({ ok: false, message: 'Invalid' });
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = createToken(user);
  res.json({ ok: true, user, token });
});

// ADMIN
app.post('/api/admin/subject', authMiddleware, adminOnly, (req, res) => {
  const { grp, year, semester, subject } = req.body || {};
  if (!grp || !year || !subject) return res.status(400).json({ ok: false, message: 'Missing' });
  db.prepare('INSERT INTO subjects (grp,year,semester,subject) VALUES (?,?,?,?)').run(grp, year, semester || 'NA', subject);
  res.json({ ok: true });
});
app.get('/api/admin/papers', authMiddleware, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM papers ORDER BY created_at DESC').all();
  res.json(rows);
});
app.post('/api/admin/approve/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  db.prepare('UPDATE papers SET approved = 1 WHERE id = ?').run(id);
  res.json({ ok: true });
});
app.post('/api/admin/reject/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM papers WHERE id = ?').run(id);
  db.prepare('DELETE FROM files WHERE paper_id = ?').run(id);
  res.json({ ok: true });
});

// UPLOAD
app.post('/api/upload/create-paper', authMiddleware, (req, res) => {
  const { title, grp, year, semester, subject } = req.body || {};
  if (!title || !grp || !year || !subject) return res.status(400).json({ ok: false, message: 'Missing' });
  const info = db.prepare('INSERT INTO papers (title,grp,year,semester,subject,uploaded_by) VALUES (?,?,?,?,?,?)')
    .run(title, grp, year, semester || 'NA', subject, req.user.id);
  const paperId = info.lastInsertRowid;
  res.json({ ok: true, paperId });
});
app.post('/api/upload/files', authMiddleware, upload.array('files', 20), (req, res) => {
  const { paperId } = req.body;
  if (!paperId) return res.status(400).json({ ok: false, message: 'Missing paperId' });
  const files = req.files || [];
  const insert = db.prepare('INSERT INTO files (paper_id,filename,originalname,filepath,mimetype) VALUES (?,?,?,?,?)');
  files.forEach(f => {
    insert.run(paperId, f.filename, f.originalname, f.path, f.mimetype);
  });
  res.json({ ok: true, uploaded: files.length });
});

// LIST & FILTER
app.get('/api/papers', (req, res) => {
  const { grp, year, semester, subject, approved } = req.query;
  let sql = 'SELECT p.*, u.name as uploader FROM papers p LEFT JOIN users u ON u.id = p.uploaded_by WHERE 1=1 ';
  const params = [];
  if (grp) { sql += ' AND p.grp = ?'; params.push(grp); }
  if (year) { sql += ' AND p.year = ?'; params.push(year); }
  if (semester) { sql += ' AND p.semester = ?'; params.push(semester); }
  if (subject) { sql += ' AND p.subject = ?'; params.push(subject); }
  if (approved) { sql += ' AND p.approved = ?'; params.push(approved == '1' ? 1 : 0); }
  sql += ' ORDER BY p.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});
app.get('/api/papers/:id/files', (req, res) => {
  const id = req.params.id;
  const files = db.prepare('SELECT * FROM files WHERE paper_id = ?').all(id);
  res.json(files);
});
app.get('/api/file/:id', (req, res) => {
  const id = req.params.id;
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  if (!f) return res.status(404).send('Not found');
  db.prepare('UPDATE papers SET downloads = downloads + 1 WHERE id = ?').run(f.paper_id);
  res.sendFile(path.resolve(f.filepath));
});
app.get('/api/subjects', (req, res) => {
  const rows = db.prepare('SELECT * FROM subjects ORDER BY grp,year,semester,subject').all();
  res.json(rows);
});
app.get('/api/most-downloaded', (req, res) => {
  const rows = db.prepare('SELECT * FROM papers ORDER BY downloads DESC LIMIT 10').all();
  res.json(rows);
});

app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Server running at http://127.0.0.1:${PORT}`));
JS

# public/index.html
cat > public/index.html <<'HTML'
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Student PQP Hub</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="app">
    <header>
      <h1>Student PQP Hub</h1>
      <div id="userBlock"></div>
    </header>

    <main>
      <section id="auth">
        <h2>Login / Register</h2>
        <input id="name" placeholder="Name (for register)" />
        <input id="email" placeholder="Email" />
        <input id="password" placeholder="Password" type="password" />
        <button onclick="register()">Register</button>
        <button onclick="login()">Login</button>
      </section>

      <section id="upload" style="display:none">
        <h2>Upload Question Paper</h2>
        <input id="title" placeholder="Paper title" />
        <select id="grp"></select>
        <select id="year"></select>
        <select id="semester"></select>
        <select id="subject"></select>
        <input id="files" type="file" multiple />
        <button onclick="createPaper()">Create Paper (then upload files)</button>
        <div id="uploadHistory"></div>
      </section>

      <section id="browse">
        <h2>Browse Papers</h2>
        <select id="fgrp"></select>
        <select id="fyear"></select>
        <select id="fsemester"></select>
        <select id="fsubject"></select>
        <button onclick="filterPapers()">Search</button>
        <h3>Most downloaded</h3>
        <div id="most"></div>
        <h3>Results</h3>
        <div id="results"></div>
      </section>
    </main>
  </div>

<script src="/app.js"></script>
</body>
</html>
HTML

# public/style.css
cat > public/style.css <<'CSS'
body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f5f7fb;color:#222}
.app{max-width:900px;margin:0 auto;padding:12px}
header{display:flex;justify-content:space-between;align-items:center}
input,select,button{display:block;margin:8px 0;padding:8px;width:100%;max-width:420px}
button{cursor:pointer}
#results .paper{background:#fff;padding:10px;margin:8px 0;border-radius:6px}
@media(min-width:700px){input,select{max-width:320px}}
CSS

# public/app.js
cat > public/app.js <<'JS'
const API = '';
let subjects = [];
let token = localStorage.getItem('token') || null;
let currentUser = null;

async function request(url, opts={}) {
  opts.headers = opts.headers || {};
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + url, opts);
  if (res.status === 401) { logoutLocal(); }
  return res;
}

async function register(){
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const r = await request('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,password}) });
  const data = await r.json();
  if (data.ok){ setToken(data.token, data.user); }
  else alert(data.message||'Error');
}

async function login(){
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const r = await request('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
  const data = await r.json();
  if (data.ok){ setToken(data.token, data.user); }
  else alert(data.message||'Login failed');
}

function setToken(t,u){ token = t; currentUser = u; localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); updateUI(); }
function logoutLocal(){ token = null; currentUser = null; localStorage.removeItem('token'); localStorage.removeItem('user'); updateUI(); }

function updateUI(){
  document.getElementById('userBlock').innerText = currentUser ? ('Hello '+(currentUser.name||currentUser.email)) : '';
  document.getElementById('auth').style.display = currentUser ? 'none' : 'block';
  document.getElementById('upload').style.display = currentUser ? 'block' : 'none';
}

async function loadSubjects(){
  const r = await request('/api/subjects');
  const data = await r.json();
  subjects = data;
  populateGroupYear();
}

function populateGroupYear(){
  const grpSel = document.getElementById('grp');
  const yrSel = document.getElementById('year');
  const semSel = document.getElementById('semester');
  const subjSel = document.getElementById('subject');

  const groups = [...new Set(subjects.map(s=>s.grp))];
  fillSelect(grpSel, ['Select Group'].concat(groups));
  fillSelect(document.getElementById('fgrp'), ['All'].concat(groups));
  grpSel.onchange = ()=>{
    const g = grpSel.value;
    const years = [...new Set(subjects.filter(s=>s.grp===g).map(s=>s.year))];
    fillSelect(yrSel, ['Select Year'].concat(years));
    semSel.style.display = 'none';
    subjSel.innerHTML = '';
  }
  yrSel.onchange = ()=>{
    const g = grpSel.value; const y = yrSel.value;
    const sems = [...new Set(subjects.filter(s=>s.grp===g && s.year===y).map(s=>s.semester))];
    if (sems.length && sems[0] !== 'NA'){
      semSel.style.display='block'; fillSelect(semSel, ['Select Semester'].concat(sems));
    } else { semSel.style.display='none'; }
    subjSel.innerHTML = '';
  }
  semSel.onchange = ()=>{ buildSubjects(); }
  yrSel.onchange();
}

function buildSubjects(){
  const g = document.getElementById('grp').value;
  const y = document.getElementById('year').value;
  const s = document.getElementById('semester').value || 'NA';
  const list = subjects.filter(x=>x.grp===g && x.year===y && (x.semester===s || x.semester==='NA'));
  fillSelect(document.getElementById('subject'), ['Select Subject'].concat(list.map(l=>l.subject)));
}

function fillSelect(sel, arr){ sel.innerHTML = ''; arr.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.innerText=v; sel.appendChild(o); }); }

async function createPaper(){
  const title = document.getElementById('title').value;
  const grp = document.getElementById('grp').value;
  const year = document.getElementById('year').value;
  const semester = document.getElementById('semester').value || 'NA';
  const subject = document.getElementById('subject').value;
  if (!title || !grp || !year || !subject) return alert('Fill fields');
  const r = await request('/api/upload/create-paper', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title, grp, year, semester, subject }) });
  const data = await r.json();
  if (!data.ok) return alert(data.message || 'Error');
  const paperId = data.paperId;
  const input = document.getElementById('files');
  const files = input.files;
  if (!files.length) return alert('Choose files');
  const fd = new FormData();
  for (let i=0;i<files.length;i++) fd.append('files', files[i]);
  fd.append('paperId', paperId);
  fd.append('grp', grp);
  fd.append('year', year);
  fd.append('semester', semester);
  fd.append('subject', subject);
  const ru = await fetch('/api/upload/files', { method:'POST', headers: token ? { 'Authorization': 'Bearer '+token } : {}, body: fd });
  const du = await ru.json();
  if (du.ok) alert('Uploaded');
}

async function filterPapers(){
  const q = [];
  const grp = document.getElementById('fgrp').value;
  const year = document.getElementById('fyear').value;
  const sem = document.getElementById('fsemester').value;
  const subj = document.getElementById('fsubject').value;
  if (grp && grp !== 'All') q.push('grp=' + encodeURIComponent(grp));
  if (year && year !== 'All') q.push('year=' + encodeURIComponent(year));
  if (sem && sem !== 'All') q.push('semester=' + encodeURIComponent(sem));
  if (subj && subj !== 'All') q.push('subject=' + encodeURIComponent(subj));
  const url = '/api/papers' + (q.length ? ('?' + q.join('&')) : '');
  const r = await request(url);
  const data = await r.json();
  renderResults(data);
}

function renderResults(data){
  const out = document.getElementById('results'); out.innerHTML='';
  data.forEach(p=>{
    const div = document.createElement('div'); div.className='paper';
    div.innerHTML = `<strong>${p.title}</strong> <div>Group:${p.grp} Year:${p.year} Sem:${p.semester} Subject:${p.subject}</div>
      <div>By:${p.uploader || ''} Downloads:${p.downloads}</div>
      <button onclick="viewFiles(${p.id})">View files</button>`;
    out.appendChild(div);
  });
}

async function viewFiles(id){
  const r = await request('/api/papers/' + id + '/files');
  const data = await r.json();
  const html = data.map(f=>`<div>${f.originalname} <a href="/api/file/${f.id}" target="_blank">Open</a></div>`).join('');
  document.getElementById('results').innerHTML = html;
}

async function loadMost(){
  const r = await request('/api/most-downloaded');
  const data = await r.json();
  document.getElementById('most').innerText = JSON.stringify(data.map(x=>x.title), null, 2);
}

(function(){
  const stored = localStorage.getItem('user');
  if (stored) currentUser = JSON.parse(stored);
  token = localStorage.getItem('token') || null;
  updateUI();
  loadSubjects();
  loadMost();
})();
JS

# public/admin.html
cat > public/admin.html <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>Admin - PQP Hub</title><link rel="stylesheet" href="/style.css"></head>
<body>
<h1>Admin Panel</h1>
<button onclick="loadPapers()">Load Papers</button>
<div id="list"></div>
<h3>Add Subject</h3>
<input id="agroup" placeholder="Group" />
<input id="ayear" placeholder="Year" />
<input id="asem" placeholder="Semester (or NA)" />
<input id="asub" placeholder="Subject name" />
<button onclick="addSubject()">Add</button>
<script src="/admin.js"></script>
</body></html>
HTML

# public/admin.js
cat > public/admin.js <<'JS'
async function authReq(url, opts={}) {
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('token');
  if (token) opts.headers['Authorization'] = 'Bearer '+token;
  const r = await fetch(url, opts); return r.json();
}
async function loadPapers(){
  const data = await authReq('/api/admin/papers');
  const out = document.getElementById('list'); out.innerHTML='';
  data.forEach(p=>{
    const d = document.createElement('div'); d.innerHTML = `<div>${p.title} - ${p.grp}/${p.year}/${p.semester}/${p.subject} - approved:${p.approved} <button onclick="approve(${p.id})">Approve</button> <button onclick="reject(${p.id})">Reject</button></div>`;
    out.appendChild(d);
  });
}
async function approve(id){ await authReq('/api/admin/approve/'+id, { method:'POST' }); loadPapers(); }
async function reject(id){ await authReq('/api/admin/reject/'+id, { method:'POST' }); loadPapers(); }
async function addSubject(){ const grp=document.getElementById('agroup').value; const year=document.getElementById('ayear').value; const sem=document.getElementById('asem').value; const sub=document.getElementById('asub').value; await authReq('/api/admin/subject', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({grp,year,semester:sem,subject:sub}) }); alert('added'); }
JS

echo "Files created. Run: npm init -y && npm install express cors bcrypt jsonwebtoken sqlite3 multer better-sqlite3 uuid"
