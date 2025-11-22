/*
 create_admin.js
 Creates (or updates) an admin user with given email/password.
 Usage: node create_admin.js
*/
const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  const email = 'moodapradeep@gmail.com';
  const password = 'Admin@123'; // change later from web UI by adding profile change if you want
  const name = 'Pradeep Admin';

  // if user exists, update password and role
  const existing = db.getUserByEmail(email);
  if (existing) {
    const hash = await bcrypt.hash(password, 10);
    existing.password = hash;
    db.setUserRoleByEmail(email, 'admin');
    console.log('Updated existing user to admin:', email);
    process.exit(0);
  }

  // create user
  const hash = await bcrypt.hash(password, 10);
  const u = db.createUser({ name, email, passwordHash: hash, role: 'admin' });
  if (u) {
    db.setUserRoleByEmail(email, 'admin');
    console.log('Created admin user:', email, 'password:', password);
  } else {
    console.log('Could not create user - maybe exists. Please ensure a user exists with that email.');
  }
})();
