require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully!');
  } catch (err) {
    console.log('Prisma connection error code:', err.code);
    console.log('Prisma connection error message:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
