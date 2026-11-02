import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { Plus } from 'lucide-react';
import { Card, CsvButton, EmptyState, PageHeader } from '@/components/admin/ui';
import { DateRangeForm, Table, Td, Th } from '@/components/admin/table';
import { PaymentBadge, PurchaseStatusBadge } from '@/components/admin/status';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDate, formatINR, istDateString, istRange } from '@/lib/format';

export const metadata = { title: 'Purchases' };

type SP = Promise<{ from?: string; to?: string; status?: string; supplier?: string; q?: string }>;

export default async function PurchasesPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin('ADMIN');
  const sp = await searchParams;
  const from = sp.from ?? istDateString(new Date(Date.now() - 90 * 86_400_000));
  const { start, end, to } = istRange(from, sp.to);
  const where: Prisma.PurchaseWhereInput = {
    purchaseDate: { gte: start, lt: end },
    ...(sp.status ? { status: sp.status as 'DRAFT' } : {}),
    ...(sp.supplier ? { supplierId: sp.supplier } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q, mode: 'insensitive' } }, { invoiceNumber: { contains: sp.q, mode: 'insensitive' } }] } : {}),
  };
  const [rows, suppliers] = await Promise.all([
    prisma.purchase.findMany({ where, include: { supplier: true, items: { select: { quantity: true } } }, orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }], take: 500 }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="Purchase History"
        subtitle={`${rows.length} purchase${rows.length === 1 ? '' : 's'} · ${formatINR(rows.filter((r) => r.status === 'RECEIVED').reduce((s, r) => s + n(r.grandTotal), 0))} received`}
        actions={
          <>
            <CsvButton
              filename="purchases.csv"
              rows={[['Purchase ID', 'Invoice', 'Supplier', 'Date', 'Items', 'Quantity', 'Amount', 'Payment', 'Status', 'Created By'], ...rows.map((p) => [p.number, p.invoiceNumber, p.supplier.name, formatDate(p.purchaseDate), p.items.length, p.items.reduce((s, i) => s + i.quantity, 0), n(p.grandTotal), p.paymentStatus, p.status, p.createdByName])]}
            />
            <Link href="/admin/purchases/new" className="btn-primary px-4 py-2.5"><Plus size={15} /> New Purchase</Link>
          </>
        }
      />
      <DateRangeForm
        from={from}
        to={to}
        extra={
          <>
            <label><span className="label">Supplier</span><select name="supplier" defaultValue={sp.supplier ?? ''} className="input w-auto py-2"><option value="">All</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label><span className="label">Status</span><select name="status" defaultValue={sp.status ?? ''} className="input w-auto py-2"><option value="">All</option><option value="DRAFT">Draft</option><option value="RECEIVED">Received</option><option value="CANCELLED">Cancelled</option></select></label>
            <label><span className="label">Search</span><input name="q" defaultValue={sp.q} placeholder="Purchase ID / invoice" className="input py-2" /></label>
          </>
        }
      />
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr><Th>Purchase ID</Th><Th>Invoice</Th><Th>Supplier</Th><Th>Date</Th><Th right>Items</Th><Th right>Qty</Th><Th right>Amount</Th><Th>Payment</Th><Th>Created By</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-sand/40">
                  <Td><Link href={`/admin/purchases/${p.id}`} className="font-medium text-wine">{p.number}</Link></Td>
                  <Td>{p.invoiceNumber ?? '—'}</Td>
                  <Td>{p.supplier.name}</Td>
                  <Td className="whitespace-nowrap">{formatDate(p.purchaseDate)}</Td>
                  <Td right>{p.items.length}</Td>
                  <Td right>{p.items.reduce((s, i) => s + i.quantity, 0)}</Td>
                  <Td right>{formatINR(n(p.grandTotal))}</Td>
                  <Td><PaymentBadge status={p.paymentStatus} /></Td>
                  <Td>{p.createdByName ?? '—'}</Td>
                  <Td><PurchaseStatusBadge status={p.status} /></Td>
                  <Td>
                    <div className="flex gap-3 text-[12px] whitespace-nowrap">
                      <Link href={`/admin/purchases/${p.id}`} className="text-wine hover:underline">View</Link>
                      {p.status === 'DRAFT' && <Link href={`/admin/purchases/${p.id}/edit`} className="text-muted hover:text-wine">Edit</Link>}
                      <Link href={`/admin/purchases/${p.id}?print=1`} className="text-muted hover:text-wine">Print</Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No purchases in this period" action={<Link href="/admin/purchases/new" className="btn-primary">Record a purchase</Link>} />
        )}
      </Card>
    </>
  );
}
