import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// SQLite: desabilitar busca case-sensitive
if (process.env.DATABASE_URL?.startsWith('file:')) {
  prisma.$connect().then(() => {
    prisma.$executeRawUnsafe('PRAGMA case_sensitive_like = OFF').catch(() => {});
  });
}

export default prisma;
