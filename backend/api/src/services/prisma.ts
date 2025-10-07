import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['info', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export async function ensureDbConnection(): Promise<void> {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      retries++;
      console.warn(`Database connection attempt ${retries}/${maxRetries} failed:`, error);

      if (retries === maxRetries) {
        console.error('Failed to connect to database after maximum retries');
        throw error;
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
}

// Handle process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
