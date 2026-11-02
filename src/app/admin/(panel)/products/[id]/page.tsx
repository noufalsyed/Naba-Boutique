import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm, type ProductFormValue } from '@/components/admin/product-form';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { productPath } from '@/lib/slug';

export const metadata = { title: 'Edit Product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [p, categories, suppliers] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { createdAt: 'asc' } }, category: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  const initial: ProductFormValue = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    subcategory: p.subcategory ?? '',
    shortDesc: p.shortDesc ?? '',
    description: p.description ?? '',
    fabric: p.fabric ?? '',
    careNotes: p.careNotes ?? '',
    supplierId: p.supplierId ?? '',
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    status: p.status,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? '' })),
    variants: p.variants.map((v) => ({
      id: v.id, sku: v.sku, size: v.size, color: v.color, price: String(n(v.price)), mrp: String(n(v.mrp)), costPrice: String(n(v.costPrice)),
      lowStockLevel: String(v.lowStockLevel), openingStock: '0', isActive: v.isActive, stock: v.stock,
    })),
  };
  return (
    <>
      <PageHeader
        title={p.name}
        back={{ href: '/admin/products', label: 'Products' }}
        actions={
          <>
            <Link href={`/admin/stock/movements?product=${p.id}`} className="btn-outline px-4 py-2.5">Stock history</Link>
            <a href={productPath(p.category.slug, p.slug)} target="_blank" className="btn-outline px-4 py-2.5">View in store ↗</a>
          </>
        }
      />
      {admin.role === 'ADMIN' ? (
        <ProductForm initial={initial} categories={categories} suppliers={suppliers} canDelete />
      ) : (
        <p className="text-muted">Only administrators can edit products.</p>
      )}
    </>
  );
}
