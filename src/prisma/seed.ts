import 'dotenv/config';
import { hashSecret } from '../common/utils/hashing.util.js';
import { db } from './db.js';
import { trimAndLowercase } from '../common/utils/text.util.js';

async function main() {
  const name = process.env['ADMIN_NAME'];
  const email = process.env['ADMIN_EMAIL'] ? trimAndLowercase(process.env['ADMIN_EMAIL']) : undefined;
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

  const hashedPassword = await hashSecret(password);

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