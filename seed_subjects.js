/*
  seed_subjects.js
  If subjects table is empty, insert a full sample list.
  Safe to require() on startup.
*/
const db = require('./db');

function addSamples() {
  const existing = db.listSubjects();
  if (existing && existing.length) {
    console.log('Subjects already present, skipping seed.');
    return;
  }

  const samples = [
    { grp:'CEC', year:'1st Year', semester:'Semester 1', subject:'Business Organization' },
    { grp:'CEC', year:'1st Year', semester:'Semester 1', subject:'Financial Accounting I' },
    { grp:'CEC', year:'1st Year', semester:'Semester 1', subject:'Business Mathematics' },
    { grp:'CEC', year:'1st Year', semester:'Semester 2', subject:'Business Law' },
    { grp:'CEC', year:'1st Year', semester:'Semester 2', subject:'Financial Accounting II' },
    { grp:'CEC', year:'1st Year', semester:'Semester 2', subject:'Business Economics' },
    { grp:'CEC', year:'2nd Year', semester:'Semester 3', subject:'Corporate Accounting' },
    { grp:'CEC', year:'2nd Year', semester:'Semester 3', subject:'Cost Accounting' },
    { grp:'CEC', year:'2nd Year', semester:'Semester 3', subject:'Business Statistics' },
    { grp:'CEC', year:'2nd Year', semester:'Semester 4', subject:'Income Tax' },
    { grp:'CEC', year:'2nd Year', semester:'Semester 4', subject:'Auditing' },
    { grp:'CEC', year:'2nd Year', semester:'Semester 4', subject:'Commercial Law' },
    { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Mathematics I' },
    { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Physics I' },
    { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Chemistry I' },
    { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Mathematics II' },
    { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Physics II' },
    { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Chemistry II' },
    { grp:'MPC', year:'2nd Year', semester:'Semester 3', subject:'Mathematical Methods' },
    { grp:'MPC', year:'2nd Year', semester:'Semester 3', subject:'Electromagnetics' },
    { grp:'BCom', year:'1st Year', semester:'Semester 1', subject:'Business Organization' },
    { grp:'BCom', year:'1st Year', semester:'Semester 1', subject:'Business Accounting I' },
    { grp:'BCom', year:'2nd Year', semester:'Semester 3', subject:'Corporate Accounting' },
    { grp:'BCom', year:'2nd Year', semester:'Semester 3', subject:'Business Statistics' },
    { grp:'BCom', year:'3rd Year', semester:'Semester 5', subject:'Management Accounting' },
    { grp:'BA', year:'1st Year', semester:'Semester 1', subject:'English' },
    { grp:'BA', year:'1st Year', semester:'Semester 1', subject:'History' },
    { grp:'BA', year:'2nd Year', semester:'Semester 3', subject:'Sociology' },
    { grp:'BSc', year:'1st Year', semester:'Semester 1', subject:'Botany' },
    { grp:'BSc', year:'1st Year', semester:'Semester 2', subject:'Zoology' },
    { grp:'Diploma', year:'1st Year', semester:'Semester 1', subject:'Engineering Mathematics' },
    { grp:'Diploma', year:'1st Year', semester:'Semester 2', subject:'Workshop Practice' },
    { grp:'Inter', year:'1st Year', semester:'NA', subject:'Telugu' },
    { grp:'Inter', year:'1st Year', semester:'NA', subject:'English' },
    { grp:'Inter', year:'2nd Year', semester:'NA', subject:'Maths' },
    { grp:'Common', year:'All', semester:'NA', subject:'Environmental Studies' },
    { grp:'Common', year:'All', semester:'NA', subject:'Computer Applications' }
  ];

  samples.forEach(s => {
    try { db.insertSubject(s); }
    catch(e){ console.error('seed error', e && e.message); }
  });
  console.log('Seeded subjects:', samples.length);
}

addSamples();
module.exports = { addSamples };
