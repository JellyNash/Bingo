import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['info', 'warn', 'error'] : ['warn', 'error'],
});

export async function ensureDbConnection(): Promise<void> {
  await prisma.$connect();
}
