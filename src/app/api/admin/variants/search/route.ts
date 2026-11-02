import { z } from 'zod';
import { adminApi } from '@/server/http';
import { prisma, n } from '@/server/db';

/** Variant picker for sales, purchases and stock adjustments. */
export const GET = adminApi('ANY', async ({ query }) => {
  const { q, all } = query(z.object({ q: z.string().max(80).default(''), all: z.string().optional() }));
  const words = q.trim().split(/\s+/).filter(Boolean);
  const rows = await prisma.productVariant.findMany({
    where: {
      ...(all ? {} : { isActive: true, product: { status: { not: 'ARCHIVED' } } }),
      AND: words.map((w) => ({
        OR: [{ sku: { contains: w, mode: 'insensitive' as const } }, { color: { contains: w, mode: 'insensitive' as const } }, { size: { equals: w, mode: 'insensitive' as const } }, { product: { name: { contains: w, mode: 'insensitive' as const } } }],
      })),
    },
    include: { product: { select: { name: true, category: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } } } },
    orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }],
    take: 25,
  });
  return rows.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.product.name,
    category: v.product.category.name,
    size: v.size,
    color: v.color,
    price: n(v.price),
    mrp: n(v.mrp),
    costPrice: n(v.costPrice),
    stock: v.stock,
    reserved: v.reserved,
    available: v.stock - v.reserved,
    image: v.product.images[0]?.url ?? null,
  }));
});
