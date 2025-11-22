/*
  add_sample_subjects.js
  Adds a bunch of example subjects to the JSON DB used by Student PQP Hub.
*/
const db = require('./db');

const samples = [
  // CEC (degree) — semesters used
  { grp:'CEC', year:'1st Year', semester:'Semester 1', subject:'Principles of Commerce' },
  { grp:'CEC', year:'1st Year', semester:'Semester 2', subject:'Business Law' },
  { grp:'CEC', year:'2nd Year', semester:'Semester 3', subject:'Corporate Accounting' },
  { grp:'CEC', year:'2nd Year', semester:'Semester 4', subject:'Income Tax' },

  // MPC (degree)
  { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Mathematics I' },
  { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Physics I' },
  { grp:'MPC', year:'2nd Year', semester:'Semester 3', subject:'Mathematics II' },

  // BCom
  { grp:'BCom', year:'2nd Year', semester:'Semester 3', subject:'Corporate Accounting' },
  { grp:'BCom', year:'2nd Year', semester:'Semester 4', subject:'Business Statistics' },

  // BA
  { grp:'BA', year:'1st Year', semester:'Semester 1', subject:'History' },
  { grp:'BA', year:'1st Year', semester:'Semester 2', subject:'Political Science' },

  // BSc
  { grp:'BSc', year:'1st Year', semester:'Semester 1', subject:'Botany' },
  { grp:'BSc', year:'1st Year', semester:'Semester 2', subject:'Zoology' },

  // Diploma (degree-like; include semesters)
  { grp:'Diploma', year:'1st Year', semester:'Semester 1', subject:'Engineering Maths' },
  { grp:'Diploma', year:'1st Year', semester:'Semester 2', subject:'Workshop Practice' },

  // Intermediate / Inter (no semesters - treat as NA)
  { grp:'Inter', year:'1st Year', semester:'NA', subject:'Telugu' },
  { grp:'Inter', year:'1st Year', semester:'NA', subject:'English' },
  { grp:'Inter', year:'2nd Year', semester:'NA', subject:'Maths' }
];

samples.forEach(s => {
  try {
    db.insertSubject(s);
    console.log('Inserted:', s.grp, s.year, s.semester, s.subject);
  } catch(e) {
    console.error('Error inserting', s, e && e.message);
  }
});

console.log('Sample subjects added.');
