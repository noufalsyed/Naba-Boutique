import { PageHeader } from '@/components/admin/ui';
import { CategoryManager } from '@/components/admin/category-manager';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  await requireAdmin('ADMIN');
  const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Categories" subtitle="Shown in the store menu and on the home page." />
      <CategoryManager
        categories={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '', imageUrl: c.imageUrl ?? '', sortOrder: c.sortOrder, isActive: c.isActive, count: c._count.products }))}
      />
    </>
  );
}
