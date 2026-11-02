import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { conflict } from '@/server/errors';
import { categoryInput } from '@/lib/validators';
import { slugify } from '@/lib/slug';

export const PUT = adminApi<{ id: string }>('ADMIN', async ({ body, params }) => {
  const c = await body(categoryInput);
  return prisma.category.update({ where: { id: params.id }, data: { ...c, slug: slugify(c.slug || c.name) } });
});

export const DELETE = adminApi<{ id: string }>('ADMIN', async ({ params }) => {
  const count = await prisma.product.count({ where: { categoryId: params.id } });
  if (count) throw conflict(`This category has ${count} product(s). Move them or hide the category instead.`);
  await prisma.category.delete({ where: { id: params.id } });
  return { ok: true };
});
