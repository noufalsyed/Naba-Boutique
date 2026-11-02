import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, PageHeader } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { PaymentBadge, PurchaseStatusBadge } from '@/components/admin/status';
import { PurchaseActions } from '@/components/admin/purchase-actions';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDate, formatDateTime, formatINR } from '@/lib/format';
import { BRAND } from '@/lib/constants';

export const metadata = { title: 'Purchase' };

export default async function PurchasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  await requireAdmin('ADMIN');
  const { id } = await params;
  const sp = await searchParams;
  const p = await prisma.purchase.findUnique({ where: { id }, include: { supplier: true, items: { include: { variant: { select: { productId: true } } } }, returns: { include: { items: true }, orderBy: { createdAt: 'asc' } } } });
  if (!p) notFound();
  const units = p.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <PageHeader
        title={`Purchase ${p.number}`}
        subtitle={<span className="flex flex-wrap items-center gap-2"><PurchaseStatusBadge status={p.status} /> <PaymentBadge status={p.paymentStatus} /> {p.receivedAt && <span>Received {formatDateTime(p.receivedAt)}</span>}</span>}
        back={{ href: '/admin/purchases', label: 'Purchases' }}
        actions={<PurchaseActions id={p.id} status={p.status} autoPrint={sp.print === '1'} items={p.items.map((i) => ({ id: i.id, productName: i.productName, sku: i.sku, size: i.size, quantity: i.quantity, returnedQty: i.returnedQty }))} />}
      />
      <div className="mb-4 hidden print:block">
        <p className="font-serif text-2xl">{BRAND}</p>
        <p>Purchase {p.number}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Supplier" className="md:col-span-1">
          <div className="space-y-1 p-4 text-[14px]">
            <Link href={`/admin/suppliers/${p.supplierId}`} className="font-medium text-wine">{p.supplier.name}</Link>
            {p.supplier.companyName && <p>{p.supplier.companyName}</p>}
            <p className="text-muted">{p.supplierContact ?? p.supplier.phone}</p>
            {p.supplier.gstin && <p className="text-muted">GSTIN {p.supplier.gstin}</p>}
          </div>
        </Card>
        <Card title="Purchase" className="md:col-span-2">
          <dl className="grid grid-cols-2 gap-4 p-4 text-[14px] sm:grid-cols-4">
            <div><dt className="label">Invoice No.</dt><dd>{p.invoiceNumber ?? '—'}</dd></div>
            <div><dt className="label">Date</dt><dd>{formatDate(p.purchaseDate)}</dd></div>
            <div><dt className="label">Created by</dt><dd>{p.createdByName ?? '—'}</dd></div>
            <div><dt className="label">Units</dt><dd>{units}</dd></div>
            {p.notes && <div className="col-span-full"><dt className="label">Notes</dt><dd>{p.notes}</dd></div>}
          </dl>
        </Card>
      </div>
      <Card className="mt-5">
        <Table>
          <thead>
            <tr><Th>Product</Th><Th>SKU</Th><Th>Category</Th><Th>Size</Th><Th>Colour</Th><Th right>Qty</Th><Th right>Purchase</Th><Th right>Selling</Th><Th right>Discount</Th><Th right>Total</Th></tr>
          </thead>
          <tbody>
            {p.items.map((i) => (
              <tr key={i.id}>
                <Td>{i.variant ? <Link href={`/admin/products/${i.variant.productId}`} className="hover:text-wine">{i.productName}</Link> : <>{i.productName} <span className="text-[11px] text-warn">(new — created on receive)</span></>}{i.returnedQty > 0 && <div className="text-[11.5px] text-danger">{i.returnedQty} returned</div>}</Td>
                <Td className="font-mono text-[12.5px]">{i.sku || 'Auto'}</Td>
                <Td>{i.categoryName}</Td>
                <Td>{i.size}</Td>
                <Td>{i.color || '—'}</Td>
                <Td right>{i.quantity}</Td>
                <Td right>{formatINR(n(i.purchasePrice))}</Td>
                <Td right>{formatINR(n(i.sellingPrice))}</Td>
                <Td right>{n(i.discount) ? formatINR(n(i.discount)) : '—'}</Td>
                <Td right className="font-medium">{formatINR(n(i.total))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="flex justify-end p-4">
          <dl className="w-full max-w-xs space-y-1.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(n(p.subtotal))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>− {formatINR(n(p.discount))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Additional charges</dt><dd>{formatINR(n(p.additionalCharges))}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-[17px] font-medium"><dt>Grand Total</dt><dd>{formatINR(n(p.grandTotal))}</dd></div>
          </dl>
        </div>
      </Card>
      {p.returns.length > 0 && (
        <Card title="Purchase Returns" className="mt-5">
          <Table>
            <thead><tr><Th>Return</Th><Th>Date</Th><Th right>Units</Th><Th right>Amount</Th><Th>Reason</Th><Th>By</Th></tr></thead>
            <tbody>
              {p.returns.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.number}</Td>
                  <Td>{formatDateTime(r.createdAt)}</Td>
                  <Td right>{r.items.reduce((s, i) => s + i.quantity, 0)}</Td>
                  <Td right>{formatINR(n(r.amount))}</Td>
                  <Td>{r.reason ?? '—'}</Td>
                  <Td>{r.createdByName}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
