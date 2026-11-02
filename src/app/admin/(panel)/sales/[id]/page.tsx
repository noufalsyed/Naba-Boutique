import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Card, PageHeader, PrintButton } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { ChannelBadge, OrderStatusBadge, PaymentBadge } from '@/components/admin/status';
import { OrderManage } from '@/components/admin/order-manage';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { storeConfig } from '@/server/config';
import { formatDateTime, formatINR } from '@/lib/format';
import { BRAND, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type OrderStatusKey } from '@/lib/constants';
import { waLink } from '@/lib/whatsapp';

export const metadata = { title: 'Order' };

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { select: { productId: true } } } },
      payments: { orderBy: { createdAt: 'desc' } },
      returns: { include: { items: true }, orderBy: { createdAt: 'asc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!o) notFound();
  const cfg = storeConfig();
  const wa = o.whatsapp || o.phone;
  const waHref = wa ? waLink(`91${wa}`, `Hi ${o.customerName.split(' ')[0]}, this is ${cfg.businessName} about your order ${o.number}.`) : '';

  return (
    <>
      <PageHeader
        title={`Order ${o.number}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <ChannelBadge channel={o.channel} /> <OrderStatusBadge status={o.status} /> <PaymentBadge status={o.paymentStatus} /> {formatDateTime(o.createdAt)}
          </span>
        }
        back={{ href: '/admin/sales', label: 'Sales' }}
        actions={<PrintButton label="Print Invoice" />}
      />
      {o.needsAttention && (
        <p className="mb-4 flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[14px] text-danger">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" /> {o.needsAttention}
        </p>
      )}
      <div className="mb-4 hidden print:block">
        <p className="font-serif text-2xl">{BRAND}</p>
        <p>{cfg.address} · {cfg.phone}</p>
        <p className="mt-2 font-medium">Invoice {o.number} · {formatDateTime(o.createdAt)}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Items">
            <Table>
              <thead><tr><Th>Product</Th><Th>SKU</Th><Th>Size</Th><Th>Colour</Th><Th right>Qty</Th><Th right>Price</Th><Th right>Total</Th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <Td><Link href={`/admin/products/${i.variant.productId}`} className="hover:text-wine">{i.productName}</Link>{i.returnedQty > 0 && <div className="text-[11.5px] text-danger">{i.returnedQty} returned</div>}</Td>
                    <Td className="font-mono text-[12.5px]">{i.sku}</Td>
                    <Td>{i.size}</Td>
                    <Td>{i.color || '—'}</Td>
                    <Td right>{i.quantity}</Td>
                    <Td right>{formatINR(n(i.price))}{n(i.mrp) > n(i.price) && <div className="text-[11px] text-muted line-through">{formatINR(n(i.mrp))}</div>}</Td>
                    <Td right className="font-medium">{formatINR(n(i.total))}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex justify-end p-4">
              <dl className="w-full max-w-xs space-y-1.5 text-[14px]">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(n(o.subtotal))}</dd></div>
                {n(o.extraDiscount) > 0 && <div className="flex justify-between"><dt className="text-muted">Bill discount</dt><dd>− {formatINR(n(o.extraDiscount))}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{n(o.shipping) ? formatINR(n(o.shipping)) : 'Free'}</dd></div>
                <div className="flex justify-between border-t border-line pt-2 text-[17px] font-medium"><dt>Total</dt><dd>{formatINR(n(o.total))}</dd></div>
                {o.paymentMethod && <div className="flex justify-between text-muted"><dt>Paid by</dt><dd>{PAYMENT_METHOD_LABEL[o.paymentMethod]}</dd></div>}
              </dl>
            </div>
          </Card>

          {o.payments.length > 0 && (
            <Card title="Gateway Payments">
              <Table>
                <thead><tr><Th>Date</Th><Th>Gateway</Th><Th>Gateway order</Th><Th>Payment ID</Th><Th>Method</Th><Th right>Amount</Th><Th>Result</Th></tr></thead>
                <tbody>
                  {o.payments.map((p) => (
                    <tr key={p.id}>
                      <Td className="text-[12.5px]">{formatDateTime(p.createdAt)}</Td>
                      <Td>{p.provider}</Td>
                      <Td className="font-mono text-[12px]">{p.providerOrderId}</Td>
                      <Td className="font-mono text-[12px]">{p.providerPaymentId ?? '—'}</Td>
                      <Td>{p.method ?? '—'}</Td>
                      <Td right>{formatINR(n(p.amount))}</Td>
                      <Td>{p.status === 'SUCCESS' ? <span className="text-success">Verified</span> : p.status === 'FAILED' ? <span className="text-danger">Failed{p.errorReason ? `: ${p.errorReason}` : ''}</span> : 'Started'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          {o.returns.length > 0 && (
            <Card title="Returns">
              <Table>
                <thead><tr><Th>Return</Th><Th>Date</Th><Th right>Units</Th><Th right>Refund</Th><Th>Method</Th><Th>Reason</Th><Th>By</Th></tr></thead>
                <tbody>
                  {o.returns.map((r) => (
                    <tr key={r.id}>
                      <Td className="font-medium">{r.number}</Td>
                      <Td className="text-[12.5px]">{formatDateTime(r.createdAt)}</Td>
                      <Td right>{r.items.reduce((s, i) => s + i.quantity, 0)}</Td>
                      <Td right>{formatINR(n(r.refundAmount))}</Td>
                      <Td>{PAYMENT_METHOD_LABEL[r.refundMethod]}</Td>
                      <Td>{r.reason ?? '—'}</Td>
                      <Td>{r.createdByName}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          <Card title="History" className="no-print">
            <ol className="space-y-2.5 p-4 text-[13.5px]">
              {o.statusHistory.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="w-36 shrink-0 text-[12px] text-muted">{formatDateTime(h.createdAt)}</span>
                  <span><span className="font-medium">{ORDER_STATUS_LABEL[h.status as OrderStatusKey]}</span>{h.note ? ` — ${h.note}` : ''}{h.userName ? <span className="text-muted"> · {h.userName}</span> : null}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Customer">
            <div className="space-y-1 p-4 text-[14px]">
              <p className="font-medium">{o.customerName}</p>
              {o.phone && <p><a href={`tel:${o.phone}`} className="hover:text-wine">{o.phone}</a>{o.whatsapp && o.whatsapp !== o.phone ? ` · WhatsApp ${o.whatsapp}` : ''}</p>}
              {o.email && <p className="text-muted">{o.email}</p>}
              {o.address && (
                <p className="pt-2">
                  {o.address}<br />{o.city}, {o.state} – {o.pincode}
                </p>
              )}
              {o.deliveryNotes && <p className="pt-2 text-muted">Note: {o.deliveryNotes}</p>}
              {o.cashierName && <p className="pt-2 text-[12.5px] text-muted">Cashier / handled by: {o.cashierName}</p>}
              {o.trackingNumber && <p className="pt-2 text-[13px]">Tracking: {o.courier} {o.trackingNumber}</p>}
            </div>
          </Card>
          <OrderManage
            id={o.id}
            status={o.status}
            channel={o.channel}
            paymentStatus={o.paymentStatus}
            stockState={o.stockState}
            courier={o.courier ?? ''}
            trackingNumber={o.trackingNumber ?? ''}
            whatsappLink={o.channel !== 'STORE' ? waHref : ''}
            items={o.items.map((i) => ({ id: i.id, productName: i.productName, sku: i.sku, size: i.size, quantity: i.quantity, returnedQty: i.returnedQty, price: n(i.price) }))}
          />
        </div>
      </div>
    </>
  );
}
