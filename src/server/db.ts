import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type Tx = Prisma.TransactionClient;
export type Db = PrismaClient | Tx;

/** Decimal / null → number. */
export const n = (v: Prisma.Decimal | number | string | null | undefined): number => (v == null ? 0 : Number(v));

export function transaction<T>(fn: (tx: Tx) => Promise<T>) {
  return prisma.$transaction(fn, { maxWait: 10_000, timeout: 30_000 });
}
