import Link from 'next/link';
import type { MovementType, Prisma } from '@prisma/client';
import { Badge, Card, CsvButton, EmptyState, PageHeader } from '@/components/admin/ui';
import { DateRangeForm, Table, Td, Th } from '@/components/admin/table';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDateTime, istDateString, istRange } from '@/lib/format';
import { MOVEMENT_LABEL } from '@/lib/constants';

export const metadata = { title: 'Stock Movements' };

type SP = Promise<{ from?: string; to?: string; type?: string; variant?: string; product?: string; q?: string }>;

export default async function MovementsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const scoped = !!(sp.variant || sp.product);
  const from = sp.from ?? (scoped ? '2020-01-01' : istDateString(new Date(Date.now() - 30 * 86_400_000)));
  const { start, end, to } = istRange(from, sp.to);
  const where: Prisma.StockMovementWhereInput = {
    createdAt: { gte: start, lt: end },
    ...(sp.type ? { type: sp.type as MovementType } : {}),
    ...(sp.variant ? { variantId: sp.variant } : {}),
    ...(sp.product ? { variant: { productId: sp.product } } : {}),
    ...(sp.q
      ? { OR: [{ variant: { sku: { contains: sp.q, mode: 'insensitive' } } }, { variant: { product: { name: { contains: sp.q, mode: 'insensitive' } } } }, { reference: { contains: sp.q, mode: 'insensitive' } }] }
      : {}),
  };
  const rows = await prisma.stockMovement.findMany({ where, include: { variant: { include: { product: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 1000 });

  return (
    <>
      <PageHeader
        title="Stock Movements"
        subtitle="Every change to stock — where it came from and where it went."
        back={{ href: '/admin/stock', label: 'Stock' }}
        actions={
          <CsvButton
            filename="stock-movements.csv"
            rows={[
              ['Date', 'Product', 'SKU', 'Movement', 'Quantity', 'Previous Stock', 'New Stock', 'Reference', 'Note', 'User'],
              ...rows.map((m) => [formatDateTime(m.createdAt), m.variant.product.name, m.variant.sku, MOVEMENT_LABEL[m.type], m.quantity, m.previousStock, m.newStock, m.reference, m.note, m.userName]),
            ]}
          />
        }
      />
      <DateRangeForm
        from={from}
        to={to}
        extra={
          <>
            <label>
              <span className="label">Type</span>
              <select name="type" defaultValue={sp.type ?? ''} className="input w-auto py-2">
                <option value="">All types</option>
                {Object.entries(MOVEMENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Search</span>
              <input name="q" defaultValue={sp.q} placeholder="SKU, product, reference" className="input py-2" />
            </label>
            {sp.variant && <input type="hidden" name="variant" value={sp.variant} />}
            {sp.product && <input type="hidden" name="product" value={sp.product} />}
          </>
        }
      />
      {scoped && (
        <p className="mb-3 text-[13px] text-muted">
          Showing one {sp.variant ? 'SKU' : 'product'}. <Link href="/admin/stock/movements" className="text-wine underline">Show all</Link>
        </p>
      )}
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr><Th>Date</Th><Th>Product</Th><Th>SKU</Th><Th>Movement</Th><Th right>Qty</Th><Th right>Previous</Th><Th right>New</Th><Th>Reference</Th><Th>User</Th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap text-[12.5px]">{formatDateTime(m.createdAt)}</Td>
                  <Td>
                    <Link href={`/admin/products/${m.variant.product.id}`} className="hover:text-wine">{m.variant.product.name}</Link>
                    <div className="text-[11.5px] text-muted">{m.variant.size}{m.variant.color ? ` · ${m.variant.color}` : ''}</div>
                  </Td>
                  <Td className="font-mono text-[12.5px]">{m.variant.sku}</Td>
                  <Td><Badge tone={m.quantity > 0 ? 'green' : 'red'}>{MOVEMENT_LABEL[m.type]}</Badge></Td>
                  <Td right className={`font-medium ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Td>
                  <Td right className="text-muted">{m.previousStock}</Td>
                  <Td right>{m.newStock}</Td>
                  <Td>{m.reference}{m.note ? <div className="text-[11.5px] text-muted">{m.note}</div> : null}</Td>
                  <Td>{m.userName ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No stock movements in this period" />
        )}
      </Card>
    </>
  );
}
