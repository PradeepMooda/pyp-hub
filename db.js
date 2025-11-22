/*
  db.js - tiny JSON "database" for Student PQP Hub
  Stores data in ./data/db.json and provides simple CRUD helpers.
  No native modules needed.
*/
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, 'data', 'db.json');
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// init default structure if missing
function read() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { users: [], subjects: [], papers: [], files: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch (e) {
    // if corrupted, recreate
    const init = { users: [], subjects: [], papers: [], files: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
}
function write(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Users
function createUser({ name, email, passwordHash, role='user' }) {
  const db = read();
  const exists = db.users.find(u => u.email === email);
  if (exists) return null;
  const user = { id: uuidv4(), name: name||'', email, password: passwordHash, role, created_at: new Date().toISOString() };
  db.users.push(user);
  write(db);
  return user;
}
function getUserByEmail(email) {
  const db = read();
  return db.users.find(u => u.email === email) || null;
}
function setUserRoleByEmail(email, role) {
  const db = read();
  const u = db.users.find(x => x.email === email);
  if (!u) return false;
  u.role = role;
  write(db);
  return true;
}

// Subjects
function insertSubject({ grp, year, semester='NA', subject }) {
  const db = read();
  const s = { id: uuidv4(), grp, year, semester: semester||'NA', subject };
  db.subjects.push(s);
  write(db);
  return s;
}
function listSubjects() {
  const db = read();
  return db.subjects.slice();
}

// Papers
function createPaper({ title, grp, year, semester='NA', subject, uploaded_by }) {
  const db = read();
  const paper = { id: uuidv4(), title, grp, year, semester: semester||'NA', subject, uploaded_by, approved: 0, downloads: 0, created_at: new Date().toISOString() };
  db.papers.push(paper);
  write(db);
  return paper;
}
function listPapers(filters={}) {
  const db = read();
  let out = db.papers.slice();
  if (filters.grp) out = out.filter(p => p.grp === filters.grp);
  if (filters.year) out = out.filter(p => p.year === filters.year);
  if (filters.semester) out = out.filter(p => p.semester === filters.semester);
  if (filters.subject) out = out.filter(p => p.subject === filters.subject);
  if (typeof filters.approved !== 'undefined') out = out.filter(p => Number(p.approved) === Number(filters.approved));
  // newest first
  out.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  return out;
}
function getPaperById(id) {
  const db = read();
  return db.papers.find(p => p.id === id) || null;
}
function approvePaper(id) {
  const db = read();
  const p = db.papers.find(x => x.id === id);
  if (!p) return false;
  p.approved = 1;
  write(db);
  return true;
}
function deletePaper(id) {
  const db = read();
  db.papers = db.papers.filter(x => x.id !== id);
  db.files = db.files.filter(f => f.paper_id !== id);
  write(db);
  return true;
}
function incrementPaperDownloads(paperId) {
  const db = read();
  const p = db.papers.find(x => x.id === paperId);
  if (!p) return false;
  p.downloads = (p.downloads || 0) + 1;
  write(db);
  return true;
}

// Files
function addFile({ paperId, filename, originalname, filepath, mimetype }) {
  const db = read();
  const f = { id: uuidv4(), paper_id: paperId, filename, originalname, filepath, mimetype };
  db.files.push(f);
  write(db);
  return f;
}
function listFilesByPaper(paperId) {
  const db = read();
  return db.files.filter(f => f.paper_id === paperId);
}
function getFileById(id) {
  const db = read();
  return db.files.find(f => f.id === id) || null;
}

// Exports
module.exports = {
  // users
  createUser, getUserByEmail, setUserRoleByEmail,
  // subjects
  insertSubject, listSubjects,
  // papers
  createPaper, listPapers, getPaperById, approvePaper, deletePaper, incrementPaperDownloads,
  // files
  addFile, listFilesByPaper, getFileById
};
