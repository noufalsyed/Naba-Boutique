import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { categoryInput } from '@/lib/validators';
import { slugify } from '@/lib/slug';

export const POST = adminApi('ADMIN', async ({ body }) => {
  const c = await body(categoryInput);
  return prisma.category.create({ data: { ...c, slug: slugify(c.slug || c.name) } });
});
