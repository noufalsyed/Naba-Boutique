import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { Badge } from '@/components/admin/ui';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatINR } from '@/lib/format';
import { productPath } from '@/lib/slug';

export const metadata = { title: 'Products' };

type SP = Promise<{ q?: string; category?: string; status?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const where: Prisma.ProductWhereInput = {
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.status ? { status: sp.status as 'ACTIVE' } : { status: { not: 'ARCHIVED' } }),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } }] } : {}),
  };
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, include: { category: true, images: { take: 1, orderBy: { sortOrder: 'asc' } }, variants: true }, orderBy: { updatedAt: 'desc' }, take: 300 }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'}`}
        actions={admin.role === 'ADMIN' && <Link href="/admin/products/new" className="btn-primary px-4 py-2.5"><Plus size={15} /> Add Product</Link>}
      />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className="input max-w-xs py-2" />
        <select name="category" defaultValue={sp.category ?? ''} className="input w-auto py-2">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className="input w-auto py-2">
          <option value="">Active & draft</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="btn-dark px-5 py-2">Filter</button>
      </form>
      <Card>
        {products.length ? (
          <Table>
            <thead>
              <tr><Th>Product</Th><Th>Category</Th><Th right>Price</Th><Th right>Stock</Th><Th>SKUs</Th><Th>Tags</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const prices = p.variants.map((v) => n(v.price));
                const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                return (
                  <tr key={p.id} className="hover:bg-sand/40">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 shrink-0 bg-sand">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}</div>
                        <div>
                          <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-wine">{p.name}</Link>
                          <div className="text-[11.5px] text-muted"><a href={productPath(p.category.slug, p.slug)} target="_blank" className="hover:underline">View in store ↗</a></div>
                        </div>
                      </div>
                    </Td>
                    <Td>{p.category.name}</Td>
                    <Td right>{prices.length ? (min === max ? formatINR(min) : `${formatINR(min)} – ${formatINR(max)}`) : '—'}</Td>
                    <Td right className={stock === 0 ? 'text-danger' : ''}>{stock}</Td>
                    <Td>{p.variants.length}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.isFeatured && <Badge tone="wine">Featured</Badge>}
                        {p.isNewArrival && <Badge tone="blue">New</Badge>}
                        {p.isBestSeller && <Badge tone="green">Best seller</Badge>}
                      </div>
                    </Td>
                    <Td><Badge tone={p.status === 'ACTIVE' ? 'green' : p.status === 'DRAFT' ? 'amber' : 'grey'}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</Badge></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No products found" hint="Add a product, import from Excel, or record a purchase." />
        )}
      </Card>
    </>
  );
}
