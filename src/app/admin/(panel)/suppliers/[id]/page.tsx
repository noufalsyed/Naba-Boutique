import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Card, PageHeader } from '@/components/admin/ui';
import { StatCard, Table, Td, Th } from '@/components/admin/table';
import { PaymentBadge, PurchaseStatusBadge } from '@/components/admin/status';
import { SupplierButton } from '@/components/admin/supplier-form';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDate, formatINR } from '@/lib/format';

export const metadata = { title: 'Supplier' };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('ADMIN');
  const { id } = await params;
  const s = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: { orderBy: { purchaseDate: 'desc' }, include: { items: { select: { quantity: true, variantId: true } } } },
      products: { select: { id: true, name: true, status: true }, orderBy: { name: 'asc' } },
    },
  });
  if (!s) notFound();
  const received = s.purchases.filter((p) => p.status === 'RECEIVED');
  const suppliedVariantIds = new Set(received.flatMap((p) => p.items.map((i) => i.variantId)).filter(Boolean));
  const purchasedProducts = suppliedVariantIds.size
    ? await prisma.product.findMany({ where: { variants: { some: { id: { in: [...suppliedVariantIds] as string[] } } } }, select: { id: true, name: true } })
    : [];
  const products = new Map([...s.products, ...purchasedProducts].map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        title={s.name}
        subtitle={s.companyName ?? undefined}
        back={{ href: '/admin/suppliers', label: 'Suppliers' }}
        actions={
          <>
            <SupplierButton supplier={{ id: s.id, name: s.name, companyName: s.companyName ?? '', phone: s.phone ?? '', whatsapp: s.whatsapp ?? '', email: s.email ?? '', address: s.address ?? '', gstin: s.gstin ?? '', notes: s.notes ?? '', isActive: s.isActive }} />
            <Link href={`/admin/purchases/new?supplier=${s.id}`} className="btn-primary px-4 py-2.5"><Plus size={15} /> New Purchase</Link>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Purchases" value={formatINR(received.reduce((a, p) => a + n(p.grandTotal), 0))} hint={`${received.length} received`} tone="wine" />
        <StatCard label="Last Purchase" value={received[0] ? formatDate(received[0].purchaseDate) : '—'} />
        <StatCard label="Number of Products" value={products.size} />
        <StatCard label="Unpaid Purchases" value={received.filter((p) => p.paymentStatus !== 'PAID').length} tone="warn" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Details">
          <dl className="space-y-3 p-4 text-[14px]">
            {[['Contact', s.phone], ['WhatsApp', s.whatsapp], ['Email', s.email], ['Address', s.address], ['GST / VAT', s.gstin], ['Notes', s.notes]].map(([k, v]) => (
              <div key={k}><dt className="label mb-0">{k}</dt><dd>{v || '—'}</dd></div>
            ))}
          </dl>
        </Card>
        <Card title="Products Supplied" className="lg:col-span-2">
          <ul className="flex flex-wrap gap-2 p-4">
            {[...products].map(([pid, name]) => (
              <li key={pid}><Link href={`/admin/products/${pid}`} className="inline-block border border-line px-3 py-1.5 text-[13px] hover:border-charcoal">{name}</Link></li>
            ))}
            {!products.size && <li className="text-muted">No products yet.</li>}
          </ul>
        </Card>
      </div>
      <Card title="Purchase History" className="mt-5">
        <Table>
          <thead><tr><Th>Purchase</Th><Th>Invoice</Th><Th>Date</Th><Th right>Qty</Th><Th right>Amount</Th><Th>Payment</Th><Th>Status</Th></tr></thead>
          <tbody>
            {s.purchases.map((p) => (
              <tr key={p.id}>
                <Td><Link href={`/admin/purchases/${p.id}`} className="font-medium text-wine">{p.number}</Link></Td>
                <Td>{p.invoiceNumber ?? '—'}</Td>
                <Td>{formatDate(p.purchaseDate)}</Td>
                <Td right>{p.items.reduce((a, i) => a + i.quantity, 0)}</Td>
                <Td right>{formatINR(n(p.grandTotal))}</Td>
                <Td><PaymentBadge status={p.paymentStatus} /></Td>
                <Td><PurchaseStatusBadge status={p.status} /></Td>
              </tr>
            ))}
            {!s.purchases.length && <tr><Td colSpan={7} className="text-muted">No purchases yet.</Td></tr>}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
