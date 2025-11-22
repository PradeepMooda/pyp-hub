// Fancy modern frontend logic for Student PQP Hub

const API = '';
let subjects = [];
let token = localStorage.getItem('token') || null;
let currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

async function request(url, opts = {}) {
  opts.headers = opts.headers || {};
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + url, opts);
  if (res.status === 401) { logoutLocal(); }
  return res;
}

function setToken(t, u) {
  token = t;
  currentUser = u;
  localStorage.setItem('token', t);
  localStorage.setItem('user', JSON.stringify(u));
  updateUI();
}

function logoutLocal() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateUI();
}

function updateUI() {
  document.getElementById('userBlock').innerText = currentUser ? `Hello ${currentUser.name || currentUser.email} • ` : '';
  if (currentUser) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('uploadSection').classList.remove('hidden');
  } else {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('uploadSection').classList.add('hidden');
  }
}

// AUTH
async function register() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return alert('Enter email & password');
  const r = await request('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password }) });
  const data = await r.json();
  if (data.ok) setToken(data.token, data.user);
  else alert(data.message || 'Register failed');
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return alert('Enter email & password');
  const r = await request('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const data = await r.json();
  if (data.ok) setToken(data.token, data.user);
  else alert(data.message || 'Login failed');
}

// Subjects & dropdowns
async function loadSubjects() {
  try {
    const r = await request('/api/subjects');
    subjects = await r.json();
  } catch (e) { subjects = []; }
  populateGroupYear();
  populateFilterDropdowns();
}

function populateGroupYear() {
  const grpSel = document.getElementById('grp');
  const yrSel = document.getElementById('year');
  const semSel = document.getElementById('semester');
  const subjSel = document.getElementById('subject');

  const groups = Array.from(new Set(subjects.map(s => s.grp))).filter(Boolean);
  fillSelect(grpSel, ['Select Group'].concat(groups));
  grpSel.onchange = () => {
    const g = grpSel.value;
    const years = Array.from(new Set(subjects.filter(s => s.grp === g).map(s => s.year))).filter(Boolean);
    fillSelect(yrSel, ['Select Year'].concat(years));
    semSel.style.display = 'none';
    subjSel.innerHTML = '';
  };

  yrSel.onchange = () => {
    const g = grpSel.value; const y = yrSel.value;
    const sems = Array.from(new Set(subjects.filter(s => s.grp === g && s.year === y).map(s => s.semester))).filter(Boolean);
    if (sems.length && sems[0] !== 'NA') {
      semSel.style.display = 'block';
      fillSelect(semSel, ['Select Semester'].concat(sems));
    } else {
      semSel.style.display = 'none';
    }
    subjSel.innerHTML = '';
  };

  semSel.onchange = () => buildSubjects();
  yrSel.onchange();
}

function buildSubjects() {
  const g = document.getElementById('grp').value;
  const y = document.getElementById('year').value;
  const s = document.getElementById('semester').value || 'NA';
  const list = subjects.filter(x => x.grp === g && x.year === y && (x.semester === s || x.semester === 'NA'));
  fillSelect(document.getElementById('subject'), ['Select Subject'].concat(list.map(l => l.subject)));
}

function fillSelect(sel, arr) {
  sel.innerHTML = '';
  arr.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.innerText = v;
    sel.appendChild(o);
  });
}

// Upload flow
async function createPaper() {
  const title = document.getElementById('title').value.trim();
  const grp = document.getElementById('grp').value;
  const year = document.getElementById('year').value;
  const semester = document.getElementById('semester').value || 'NA';
  const subject = document.getElementById('subject').value;
  if (!title || !grp || !year || !subject) return alert('Fill fields');

  const r = await request('/api/upload/create-paper', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, grp, year, semester, subject }) });
  const data = await r.json();
  if (!data.ok) return alert(data.message || 'Error creating paper');

  const paperId = data.paperId;
  const input = document.getElementById('files');
  const files = input.files;
  if (!files.length) return alert('Choose files');

  const fd = new FormData();
  for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
  fd.append('paperId', paperId);
  fd.append('grp', grp);
  fd.append('year', year);
  fd.append('semester', semester);
  fd.append('subject', subject);

  const ru = await fetch('/api/upload/files', { method: 'POST', headers: token ? { 'Authorization': 'Bearer ' + token } : {}, body: fd });
  const du = await ru.json();
  if (du.ok) {
    alert('Uploaded ' + du.uploaded + ' files');
    input.value = '';
  } else alert('Upload failed');
}

// Filtering & browse
async function filterPapers() {
  const q = [];
  const grp = document.getElementById('fgrp') ? document.getElementById('fgrp').value : '';
  const year = document.getElementById('fyear') ? document.getElementById('fyear').value : '';
  const sem = document.getElementById('fsemester') ? document.getElementById('fsemester').value : '';
  const subj = document.getElementById('fsubject') ? document.getElementById('fsubject').value : '';
  if (grp && grp !== 'All') q.push('grp=' + encodeURIComponent(grp));
  if (year && year !== 'All') q.push('year=' + encodeURIComponent(year));
  if (sem && sem !== 'All') q.push('semester=' + encodeURIComponent(sem));
  if (subj && subj !== 'All') q.push('subject=' + encodeURIComponent(subj));
  const url = '/api/papers' + (q.length ? ('?' + q.join('&')) : '');
  const r = await request(url);
  const data = await r.json();
  renderResults(data);
}

function renderResults(data) {
  const out = document.getElementById('results');
  out.innerHTML = '';
  if (!data || !data.length) { out.innerHTML = '<div style="color:var(--muted)">No papers found</div>'; return; }
  data.forEach(p => {
    const div = document.createElement('div'); div.className = 'paper';
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<strong>${p.title}</strong><div style="font-size:13px;color:var(--muted)"> ${p.grp} • ${p.year} • ${p.semester} • ${p.subject}</div><div style="font-size:12px;color:var(--muted)">By: ${p.uploader || ''} • Downloads: ${p.downloads||0}</div>`;
    const actions = document.createElement('div'); actions.className = 'actions';
    actions.innerHTML = `<button class="btn" onclick="viewFiles('${p.id}')">View</button> <a class="btn primary" href="/api/papers/${p.id}/files" target="_blank">Open</a>`;
    div.appendChild(meta); div.appendChild(actions); out.appendChild(div);
  });
}

async function viewFiles(id) {
  const r = await request('/api/papers/' + id + '/files');
  const data = await r.json();
  if (!data || !data.length) return alert('No files');
  const html = data.map(f => `<div style="margin:6px 0">${f.originalname} — <a href="/api/file/${f.id}" target="_blank">Open</a></div>`).join('');
  document.getElementById('results').innerHTML = html;
}

// Most downloaded & filter dropdowns for browse area
async function loadMost() {
  const r = await request('/api/most-downloaded');
  const data = await r.json();
  const el = document.getElementById('most');
  el.innerHTML = '';
  (data || []).forEach(d => {
    const chip = document.createElement('div'); chip.className = 'chip'; chip.innerText = d.title;
    el.appendChild(chip);
  });
}

function populateFilterDropdowns() {
  const groups = Array.from(new Set(subjects.map(s => s.grp))).filter(Boolean);
  const fgrp = document.getElementById('fgrp');
  if (!fgrp) return;
  fillSelect(fgrp, ['All'].concat(groups));
  // simple year/sem/sub select placeholders (we keep defaults simple)
  fillSelect(document.getElementById('fyear'), ['All']);
  fillSelect(document.getElementById('fsemester'), ['All']);
  fillSelect(document.getElementById('fsubject'), ['All']);
}

// Init
(function(){
  updateUI();
  loadSubjects();
  loadMost();
})();
