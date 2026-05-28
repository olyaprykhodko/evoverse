import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const WEAPONS = [
  {
    name: 'Shears',
    price: 0,
    minDamage: 5,
    maxDamage: 10,
    rarity: 'COMMON' as const,
  },
  {
    name: 'Dagger',
    price: 100,
    minDamage: 15,
    maxDamage: 25,
    rarity: 'RARE' as const,
  },
  {
    name: 'Sword',
    price: 500,
    minDamage: 30,
    maxDamage: 45,
    rarity: 'EPIC' as const,
  },
  {
    name: 'Dragon Hopesh',
    price: 1500,
    minDamage: 60,
    maxDamage: 80,
    rarity: 'LEGENDARY' as const,
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  const existing = await prisma.users.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    console.log(`Admin account already exists (${email}), skipping creation.`);
    const wallet = await prisma.wallet.findUnique({
      where: { userId: existing.id },
    });
    if (!wallet) {
      await prisma.wallet.create({ data: { userId: existing.id } });
      console.log('Wallet created for existing admin.');
    }
  } else {
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
        wallet: {
          create: {},
        },
      },
    });

    console.log(`Admin account created: ${email}`);
  }

  for (const weapon of WEAPONS) {
    await prisma.weapon.upsert({
      where: { name: weapon.name },
      update: {
        price: weapon.price,
        minDamage: weapon.minDamage,
        maxDamage: weapon.maxDamage,
      },
      create: weapon,
    });
  }
  console.log(`Weapons seeded: ${WEAPONS.map((w) => w.name).join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
