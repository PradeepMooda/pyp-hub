require('./seed_subjects');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
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

// ensure uploads folder
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });

// helper to read full DB (for simple joins)
function readFullDB() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8') || '{}');
  } catch (e) {
    return { users: [], subjects: [], papers: [], files: [] };
  }
}

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { grp, year, semester, subject, paperId } = req.body || {};
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

function createToken(user) { return jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' }); }

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

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Email/password required' });
  const exists = db.getUserByEmail(email);
  if (exists) return res.status(400).json({ ok: false, message: 'Email exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = db.createUser({ name: name || '', email, passwordHash: hash, role: 'user' });
  if (!user) return res.status(500).json({ ok: false, message: 'Could not create user' });
  const token = createToken(user);
  res.json({ ok: true, user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const row = db.getUserByEmail(email);
  if (!row) return res.status(401).json({ ok: false, message: 'Invalid' });
  const match = await bcrypt.compare(password, row.password);
  if (!match) return res.status(401).json({ ok: false, message: 'Invalid' });
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = createToken(user);
  res.json({ ok: true, user, token });
});

// ============ SUBJECTS & ADMIN ============
app.post('/api/admin/subject', authMiddleware, adminOnly, (req, res) => {
  const { grp, year, semester, subject } = req.body || {};
  if (!grp || !year || !subject) return res.status(400).json({ ok: false, message: 'Missing' });
  const s = db.insertSubject({ grp, year, semester: semester || 'NA', subject });
  res.json({ ok: true, subject: s });
});

app.get('/api/admin/papers', authMiddleware, adminOnly, (req, res) => {
  const papers = db.listPapers({});
  // attach uploader name
  const full = readFullDB();
  const out = papers.map(p=>{
    const uploader = full.users.find(u=>u.id === p.uploaded_by);
    return Object.assign({}, p, { uploader: uploader ? uploader.name || uploader.email : p.uploaded_by });
  });
  res.json(out);
});

// --- Add subject via frontend (auth required) ---
// Expects JSON: { grp, year, semester, subject }
app.post('/api/subjects/add', authMiddleware, (req, res) => {
  const { grp, year, semester, subject } = req.body || {};
  if (!grp || !year || !subject) return res.status(400).json({ ok: false, message: 'grp, year and subject required' });

  try {
    // normalize and check for duplicates (case-insensitive)
    const norm = (s)=>String(s||'').trim().toLowerCase();
    const existing = db.listSubjects().find(s =>
      norm(s.grp) === norm(grp) &&
      norm(s.year) === norm(year) &&
      norm(s.semester || 'NA') === norm(semester || 'NA') &&
      norm(s.subject) === norm(subject)
    );
    if (existing) {
      return res.json({ ok: false, message: 'Subject already exists' });
    }

    // insertSubject returns the inserted subject object
    const s = db.insertSubject({ grp, year, semester: semester || 'NA', subject });
    // return fresh list so frontend can update immediately
    const all = db.listSubjects();
    return res.json({ ok: true, subject: s, subjects: all });
  } catch (e) {
    console.error('add-subject-error', e && e.message);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.post('/api/admin/approve/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  const ok = db.approvePaper(id);
  res.json({ ok });
});

app.post('/api/admin/reject/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  const ok = db.deletePaper(id);
  res.json({ ok });
});

// ============ UPLOAD PAPERS ============
app.post('/api/upload/create-paper', authMiddleware, (req, res) => {
  const { title, grp, year, semester, subject } = req.body || {};
  if (!title || !grp || !year || !subject) return res.status(400).json({ ok: false, message: 'Missing' });
  const paper = db.createPaper({ title, grp, year, semester: semester || 'NA', subject, uploaded_by: req.user.id });
  res.json({ ok: true, paperId: paper.id });
});

app.post('/api/upload/files', authMiddleware, upload.array('files', 40), (req, res) => {
  const { paperId } = req.body;
  if (!paperId) return res.status(400).json({ ok: false, message: 'Missing paperId' });
  const files = req.files || [];
  files.forEach(f=>{
    db.addFile({ paperId: paperId, filename: f.filename, originalname: f.originalname, filepath: f.path, mimetype: f.mimetype });
  });
  res.json({ ok: true, uploaded: files.length });
});

// ============ LIST & FILTER PAPERS ============
app.get('/api/papers', (req, res) => {
  const { grp, year, semester, subject, approved } = req.query;
  const filters = {};
  if (grp) filters.grp = grp;
  if (year) filters.year = year;
  if (semester) filters.semester = semester;
  if (subject) filters.subject = subject;
  if (approved) filters.approved = approved === '1' ? 1 : 0;
  const papers = db.listPapers(filters);
  // attach uploader name
  const full = readFullDB();
  const out = papers.map(p=>{
    const uploader = full.users.find(u=>u.id === p.uploaded_by);
    return Object.assign({}, p, { uploader: uploader ? uploader.name || uploader.email : p.uploaded_by });
  });
  res.json(out);
});

app.get('/api/papers/:id/files', (req, res) => {
  const id = req.params.id;
  const files = db.listFilesByPaper(id);
  res.json(files);
});

app.get('/api/file/:id', (req, res) => {
  const id = req.params.id;
  const f = db.getFileById(id);
  if (!f) return res.status(404).send('Not found');
  db.incrementPaperDownloads(f.paper_id);
  res.sendFile(path.resolve(f.filepath));
});

// subjects for dropdown
app.get('/api/subjects', (req, res) => {
  const rows = db.listSubjects();
  res.json(rows);
});

app.get('/api/most-downloaded', (req, res) => {
  const papers = db.listPapers({});
  papers.sort((a,b)=> (b.downloads||0) - (a.downloads||0));
  res.json(papers.slice(0,10));
});

// serve static frontend
app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(PORT, function() { console.log("Server running at http://127.0.0.1:" + PORT); });

// --- Admin: delete a subject by id (admin only) ---
app.post('/api/admin/subject/delete/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  // simple delete by filtering in db.deleteSubject (we don't have it — do manual)
  try {
    const dbRaw = require('./db');
    // remove subject
    const subjects = (function(){ const fs=require('fs'); const p=require('path').join(__dirname,'data','db.json'); let j=JSON.parse(fs.readFileSync(p,'utf8')||'{}'); j.subjects = (j.subjects||[]).filter(s=>s.id !== id); fs.writeFileSync(p, JSON.stringify(j,null,2)); return j.subjects; })();
    return res.json({ ok: true, message: 'Subject deleted', subjects });
  } catch (e) {
    console.error('admin-delete-subject', e && e.message);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});
