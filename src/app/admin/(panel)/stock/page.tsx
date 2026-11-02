import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { Card, CsvButton, EmptyState, PageHeader } from '@/components/admin/ui';
import { StatCard, Table, Td, Th } from '@/components/admin/table';
import { StockBadge } from '@/components/admin/status';
import { AdjustStockButton } from '@/components/admin/adjust-stock';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatINR, formatNumber } from '@/lib/format';
import { stockStatus, STOCK_STATUS_LABEL } from '@/lib/pricing';
import { sortSizes } from '@/lib/constants';

export const metadata = { title: 'Stock' };

type SP = Promise<{ q?: string; category?: string; supplier?: string; status?: string; size?: string; color?: string }>;

export default async function StockPage({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const where: Prisma.ProductVariantWhereInput = {
    product: {
      status: { not: 'ARCHIVED' },
      ...(sp.category ? { categoryId: sp.category } : {}),
      ...(sp.supplier ? { supplierId: sp.supplier } : {}),
    },
    ...(sp.size ? { size: sp.size } : {}),
    ...(sp.color ? { color: sp.color } : {}),
    ...(q ? { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { product: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
  };
  const [all, categories, suppliers, facets] = await Promise.all([
    prisma.productVariant.findMany({ where, include: { product: { include: { category: true } } }, orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }], take: 1000 }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.productVariant.findMany({ select: { size: true, color: true }, distinct: ['size', 'color'] }),
  ]);
  const rows = all
    .map((v) => ({ v, status: stockStatus(v.stock - v.reserved, v.lowStockLevel) }))
    .filter((r) => !sp.status || (sp.status === 'low' ? r.status !== 'IN_STOCK' : r.status === sp.status));
  const value = rows.reduce((s, r) => s + r.v.stock * n(r.v.costPrice), 0);
  const sizes = sortSizes([...new Set(facets.map((f) => f.size))]);
  const colors = [...new Set(facets.map((f) => f.color).filter(Boolean))].sort();
  const sel = 'input w-auto py-2';

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle="Current stock of every SKU. Changes are made through purchases, sales, returns, Excel upload or adjustments."
        actions={
          <>
            <CsvButton
              filename="stock.csv"
              rows={[
                ['Product', 'SKU', 'Category', 'Size', 'Colour', 'Purchase Price', 'Selling Price', 'Current Stock', 'Reserved', 'Low Stock Level', 'Status'],
                ...rows.map(({ v, status }) => [v.product.name, v.sku, v.product.category.name, v.size, v.color, n(v.costPrice), n(v.price), v.stock, v.reserved, v.lowStockLevel, STOCK_STATUS_LABEL[status]]),
              ]}
            />
            <Link href="/admin/stock/movements" className="btn-outline px-4 py-2.5">Stock Movements</Link>
            {admin.role === 'ADMIN' && <AdjustStockButton />}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="SKUs" value={formatNumber(rows.length)} />
        <StatCard label="Units in stock" value={formatNumber(rows.reduce((s, r) => s + r.v.stock, 0))} />
        <StatCard label="Low / out of stock" value={formatNumber(rows.filter((r) => r.status !== 'IN_STOCK').length)} tone="warn" />
        <StatCard label="Stock value (cost)" value={formatINR(Math.round(value))} />
      </div>
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search by product name / SKU" className="input max-w-xs py-2" />
        <select name="category" defaultValue={sp.category ?? ''} className={sel}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="supplier" defaultValue={sp.supplier ?? ''} className={sel}><option value="">All suppliers</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ''} className={sel}>
          <option value="">Any status</option><option value="IN_STOCK">In Stock</option><option value="low">Low + Out</option><option value="LOW_STOCK">Low Stock</option><option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
        <select name="size" defaultValue={sp.size ?? ''} className={sel}><option value="">Any size</option>{sizes.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="color" defaultValue={sp.color ?? ''} className={sel}><option value="">Any colour</option>{colors.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn-dark px-5 py-2">Filter</button>
        <Link href="/admin/stock" className="self-center px-2 text-[13px] text-muted hover:text-wine">Reset</Link>
      </form>
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr><Th>Product</Th><Th>SKU</Th><Th>Category</Th><Th>Size</Th><Th>Colour</Th><Th right>Purchase</Th><Th right>Selling</Th><Th right>Stock</Th><Th right>Reserved</Th><Th right>Low at</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody>
              {rows.map(({ v, status }) => (
                <tr key={v.id} className="hover:bg-sand/40">
                  <Td><Link href={`/admin/products/${v.productId}`} className="hover:text-wine">{v.product.name}</Link>{!v.isActive && <span className="ml-1 text-[11px] text-muted">(inactive)</span>}</Td>
                  <Td className="font-mono text-[12.5px]">{v.sku}</Td>
                  <Td>{v.product.category.name}</Td>
                  <Td>{v.size}</Td>
                  <Td>{v.color || '—'}</Td>
                  <Td right>{formatINR(n(v.costPrice))}</Td>
                  <Td right>{formatINR(n(v.price))}</Td>
                  <Td right className="font-medium">{v.stock}</Td>
                  <Td right className="text-muted">{v.reserved || '—'}</Td>
                  <Td right className="text-muted">{v.lowStockLevel}</Td>
                  <Td><StockBadge status={status} /></Td>
                  <Td>
                    <div className="flex gap-3 whitespace-nowrap">
                      {admin.role === 'ADMIN' && <AdjustStockButton compact label="Adjust" variant={{ id: v.id, sku: v.sku, name: v.product.name, size: v.size, color: v.color, stock: v.stock, reserved: v.reserved }} />}
                      <Link href={`/admin/stock/movements?variant=${v.id}`} className="text-[12px] text-muted hover:text-wine">History</Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No stock matches these filters" />
        )}
      </Card>
    </>
  );
}
