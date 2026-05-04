import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  const existing = await prisma.users.findFirst({ where: { email } });

  if (existing) {
    console.log(`Admin account already exists (${email}), skipping.`);
    return;
  }

  const hashedPassword = await argon2.hash(password);

  await prisma.users.create({
    data: {
      email,
      password: hashedPassword,
      username: 'admin',
      role: 'ADMIN',
      profile: {
        create: { rating: 0 },
      },
    },
  });

  console.log(`Admin account created: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
