import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  connectionString?: string;
};

function getPrismaClient(): PrismaClient {
  const currentConn = process.env.DATABASE_URL || process.env.DIRECT_URL || '';

  if (globalForPrisma.prisma && globalForPrisma.connectionString === currentConn) {
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaPg({ connectionString: currentConn });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
    globalForPrisma.connectionString = currentConn;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
