/*
  add_full_subjects.js
  Inserts a comprehensive set of example subjects for many groups/years/semesters.
  Run with: node add_full_subjects.js
*/
const db = require('./db');

const samples = [
  // CEC (Commerce: typical degree subjects across semesters)
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

  { grp:'CEC', year:'3rd Year', semester:'Semester 5', subject:'Management Accounting' },
  { grp:'CEC', year:'3rd Year', semester:'Semester 5', subject:'Corporate Law' },
  { grp:'CEC', year:'3rd Year', semester:'Semester 5', subject:'Advanced Accounting' },
  { grp:'CEC', year:'3rd Year', semester:'Semester 6', subject:'Strategic Management' },
  { grp:'CEC', year:'3rd Year', semester:'Semester 6', subject:'E-Commerce' },
  { grp:'CEC', year:'3rd Year', semester:'Semester 6', subject:'Cost & Management Audit' },

  // MPC (Maths, Physics, Chemistry - example degree)
  { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Mathematics I' },
  { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Physics I' },
  { grp:'MPC', year:'1st Year', semester:'Semester 1', subject:'Chemistry I' },
  { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Mathematics II' },
  { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Physics II' },
  { grp:'MPC', year:'1st Year', semester:'Semester 2', subject:'Chemistry II' },

  { grp:'MPC', year:'2nd Year', semester:'Semester 3', subject:'Mathematical Methods' },
  { grp:'MPC', year:'2nd Year', semester:'Semester 3', subject:'Electromagnetics' },
  { grp:'MPC', year:'2nd Year', semester:'Semester 3', subject:'Organic Chemistry' },
  { grp:'MPC', year:'2nd Year', semester:'Semester 4', subject:'Differential Equations' },
  { grp:'MPC', year:'2nd Year', semester:'Semester 4', subject:'Quantum Mechanics' },
  { grp:'MPC', year:'2nd Year', semester:'Semester 4', subject:'Inorganic Chemistry' },

  { grp:'MPC', year:'3rd Year', semester:'Semester 5', subject:'Real Analysis' },
  { grp:'MPC', year:'3rd Year', semester:'Semester 5', subject:'Solid State Physics' },
  { grp:'MPC', year:'3rd Year', semester:'Semester 6', subject:'Complex Analysis' },
  { grp:'MPC', year:'3rd Year', semester:'Semester 6', subject:'Nuclear Physics' },

  // BCom (Bachelor of Commerce)
  { grp:'BCom', year:'1st Year', semester:'Semester 1', subject:'Business Organization' },
  { grp:'BCom', year:'1st Year', semester:'Semester 1', subject:'Business Accounting I' },
  { grp:'BCom', year:'1st Year', semester:'Semester 2', subject:'Business Economics I' },
  { grp:'BCom', year:'2nd Year', semester:'Semester 3', subject:'Corporate Accounting' },
  { grp:'BCom', year:'2nd Year', semester:'Semester 3', subject:'Business Statistics' },
  { grp:'BCom', year:'2nd Year', semester:'Semester 4', subject:'Cost Accounting' },
  { grp:'BCom', year:'3rd Year', semester:'Semester 5', subject:'Management Accounting' },
  { grp:'BCom', year:'3rd Year', semester:'Semester 6', subject:'Taxation' },

  // BA (Bachelor of Arts)
  { grp:'BA', year:'1st Year', semester:'Semester 1', subject:'English' },
  { grp:'BA', year:'1st Year', semester:'Semester 1', subject:'History' },
  { grp:'BA', year:'1st Year', semester:'Semester 2', subject:'Political Science' },
  { grp:'BA', year:'2nd Year', semester:'Semester 3', subject:'Sociology' },
  { grp:'BA', year:'2nd Year', semester:'Semester 4', subject:'Economics' },
  { grp:'BA', year:'3rd Year', semester:'Semester 5', subject:'Psychology' },
  { grp:'BA', year:'3rd Year', semester:'Semester 6', subject:'Philosophy' },

  // BSc (Bachelor of Science)
  { grp:'BSc', year:'1st Year', semester:'Semester 1', subject:'Botany' },
  { grp:'BSc', year:'1st Year', semester:'Semester 1', subject:'Zoology' },
  { grp:'BSc', year:'1st Year', semester:'Semester 2', subject:'Chemistry' },
  { grp:'BSc', year:'2nd Year', semester:'Semester 3', subject:'Microbiology' },
  { grp:'BSc', year:'2nd Year', semester:'Semester 4', subject:'Biochemistry' },
  { grp:'BSc', year:'3rd Year', semester:'Semester 5', subject:'Genetics' },
  { grp:'BSc', year:'3rd Year', semester:'Semester 6', subject:'Ecology' },

  // Diploma (technical / polytechnic style with semesters)
  { grp:'Diploma', year:'1st Year', semester:'Semester 1', subject:'Engineering Mathematics' },
  { grp:'Diploma', year:'1st Year', semester:'Semester 1', subject:'Basic Electrical Engineering' },
  { grp:'Diploma', year:'1st Year', semester:'Semester 2', subject:'Workshop Practice' },
  { grp:'Diploma', year:'2nd Year', semester:'Semester 3', subject:'Thermodynamics' },
  { grp:'Diploma', year:'2nd Year', semester:'Semester 4', subject:'Fluid Mechanics' },
  { grp:'Diploma', year:'3rd Year', semester:'Semester 5', subject:'Machine Design' },
  { grp:'Diploma', year:'3rd Year', semester:'Semester 6', subject:'Project Work' },

  // Inter / Intermediate (Intermediate college — typically no semester mapping here; use NA)
  { grp:'Inter', year:'1st Year', semester:'NA', subject:'Telugu' },
  { grp:'Inter', year:'1st Year', semester:'NA', subject:'English' },
  { grp:'Inter', year:'1st Year', semester:'NA', subject:'Mathematics' },
  { grp:'Inter', year:'2nd Year', semester:'NA', subject:'Physics' },
  { grp:'Inter', year:'2nd Year', semester:'NA', subject:'Chemistry' },
  { grp:'Inter', year:'2nd Year', semester:'NA', subject:'Biology' },

  // Common elective / optional subjects useful for degree students
  { grp:'Common', year:'All', semester:'NA', subject:'Environmental Studies' },
  { grp:'Common', year:'All', semester:'NA', subject:'Computer Applications' },
  { grp:'Common', year:'All', semester:'NA', subject:'Communication Skills' }
];

samples.forEach(s => {
  try {
    db.insertSubject(s);
    console.log('Inserted:', s.grp, s.year, s.semester, s.subject);
  } catch(e) {
    console.error('Error inserting', s, e && e.message);
  }
});

console.log('Full subjects added.');
