import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { supplierInput } from '@/lib/validators';

export const POST = adminApi('ADMIN', async ({ body }) => prisma.supplier.create({ data: await body(supplierInput) }));
