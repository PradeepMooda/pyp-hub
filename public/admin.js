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
