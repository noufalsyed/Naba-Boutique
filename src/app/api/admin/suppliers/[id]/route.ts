import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { supplierInput } from '@/lib/validators';

export const PUT = adminApi<{ id: string }>('ADMIN', async ({ body, params }) => prisma.supplier.update({ where: { id: params.id }, data: await body(supplierInput) }));

/** Suppliers with purchases are deactivated rather than deleted. */
export const DELETE = adminApi<{ id: string }>('ADMIN', async ({ params }) => {
  const used = await prisma.purchase.count({ where: { supplierId: params.id } });
  if (used) {
    await prisma.supplier.update({ where: { id: params.id }, data: { isActive: false } });
    return { deactivated: true };
  }
  await prisma.supplier.delete({ where: { id: params.id } });
  return { deactivated: false };
});
