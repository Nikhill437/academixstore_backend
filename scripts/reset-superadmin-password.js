#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import sequelize from '../src/config/database.js';
import User from '../src/models/User.js';

function parseArgs() {
  const raw = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (!a) continue;
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = raw[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function confirm(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const args = parseArgs();
  const email = args.email || process.env.EMAIL;
  const newPassword = args.password || process.env.NEW_PASSWORD;
  const assumeYes = args.yes || args.y;

  if (!newPassword) {
    console.error('Error: new password is required. Provide with --password or NEW_PASSWORD env var.');
    console.error('Usage: node scripts/reset-superadmin-password.js --email admin@domain.com --password NewPass123 --yes');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection OK');

    let user = null;
    if (email) {
      user = await User.findOne({ where: { email } });
      if (!user) {
        console.error(`No user found with email ${email}`);
        // show super_admins
        const admins = await User.findAll({ where: { role: 'super_admin' }, attributes: ['id', 'email', 'full_name', 'is_active'] });
        if (admins.length === 0) {
          console.error('No super_admin users found in the database.');
        } else {
          console.log('Existing super_admin users:');
          admins.forEach((a) => console.log(`- ${a.email} (${a.full_name || 'no-name'}) [active=${a.is_active}]`));
        }
        process.exit(2);
      }
    } else {
      // no email provided; find a single super_admin if exists
      const admins = await User.findAll({ where: { role: 'super_admin' }, attributes: ['id', 'email', 'full_name', 'is_active'] });
      if (admins.length === 0) {
        console.error('No super_admin users found in the database. Aborting.');
        process.exit(2);
      }
      if (admins.length > 1) {
        console.log('Multiple super_admin users found. Please re-run with --email to target a specific account:');
        admins.forEach((a) => console.log(`- ${a.email} (${a.full_name || 'no-name'}) [active=${a.is_active}]`));
        process.exit(3);
      }
      user = await User.findOne({ where: { role: 'super_admin' } });
    }

    console.log(`About to set password for user: ${user.email} (${user.full_name || 'no-name'})`);
    if (!assumeYes) {
      const ok = await confirm('Proceed and overwrite password? (y/N): ');
      if (!ok) {
        console.log('Aborted by user');
        process.exit(0);
      }
    }

    // Set plaintext into the model property that the hooks expect (password_hash)
    user.password_hash = newPassword;
    await user.save();

    console.log('Password updated successfully. Consider forcing logout of existing sessions.');
    process.exit(0);
  } catch (err) {
    console.error('Error while resetting password:', err.message || err);
    console.error(err);
    process.exit(10);
  }
}

// Run
main();
