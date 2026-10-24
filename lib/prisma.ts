import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getPrismaClient() {
  let dbUrl = process.env.DATABASE_URL;

  // Resolve SQLite file path robustly across environments
  if (!dbUrl || dbUrl === 'file:./dev.db' || dbUrl === 'file:dev.db') {
    const cwd = process.cwd();
    const candidatePaths = [
      path.join(cwd, 'prisma', 'dev.db'),
      path.join(cwd, 'dev.db'),
      path.resolve(cwd, '..', 'prisma', 'dev.db'),
    ];

    const found = candidatePaths.find(p => fs.existsSync(p));
    if (found) {
      dbUrl = `file:${found}`;
    } else {
      dbUrl = `file:${candidatePaths[0]}`;
    }
  }

  return new PrismaClient({
    datasources: dbUrl
      ? {
          db: {
            url: dbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
