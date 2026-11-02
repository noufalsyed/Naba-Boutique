import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/product-form';
import { emptyProduct } from '@/lib/product-form';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';

export const metadata = { title: 'Add Product' };

export default async function NewProductPage() {
  await requireAdmin('ADMIN');
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="Add Product" back={{ href: '/admin/products', label: 'Products' }} />
      <ProductForm initial={emptyProduct(categories[0]?.id)} categories={categories} suppliers={suppliers} canDelete={false} />
    </>
  );
}
