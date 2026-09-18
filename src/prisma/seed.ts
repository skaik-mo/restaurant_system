import 'dotenv/config';
import * as argon2 from 'argon2';
import { db } from './db.js';

async function main() {
  const name = process.env['ADMIN_NAME'];
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in .env to run the seed script',
    );
  }

  const existing = await db.orm.public.User.where({ email }).first();

  if (existing) {
    console.log(`Admin user with email "${email}" already exists. Skipping.`);
    return;
  }

  const hashedPassword = await argon2.hash(password);

  const admin = await db.orm.public.User.create({
    name,
    email,
    password: hashedPassword,
    role: 'ADMIN',
    mustChangePassword: false,
    emailVerified: true,
  });

  console.log(`Created first Admin user: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  });