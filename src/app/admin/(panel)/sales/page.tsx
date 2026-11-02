import Link from 'next/link';
import type { OrderStatus, Prisma } from '@prisma/client';
import { AlertTriangle, ScanLine } from 'lucide-react';
import { Card, CsvButton, EmptyState, PageHeader } from '@/components/admin/ui';
import { DateRangeForm, Table, Td, Th } from '@/components/admin/table';
import { ChannelBadge, OrderStatusBadge, PaymentBadge } from '@/components/admin/status';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { releaseExpiredReservations } from '@/server/orders';
import { formatDateTime, formatINR, istDateString, istRange } from '@/lib/format';
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/constants';

export const metadata = { title: 'Sales' };

type SP = Promise<{ from?: string; to?: string; status?: string; channel?: string; payment?: string; q?: string }>;

export default async function SalesPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  await releaseExpiredReservations().catch(() => {});
  const sp = await searchParams;
  const from = sp.from ?? istDateString(new Date(Date.now() - 30 * 86_400_000));
  const { start, end, to } = istRange(from, sp.to);
  const statusWhere: Prisma.OrderWhereInput =
    sp.status === 'open'
      ? { status: { in: ['PENDING', 'PAYMENT_PENDING'] } }
      : sp.status === 'active'
        ? { status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED'] } }
        : ORDER_STATUSES.includes(sp.status as OrderStatus)
          ? { status: sp.status as OrderStatus }
          : {};
  const where: Prisma.OrderWhereInput = {
    createdAt: { gte: start, lt: end },
    ...statusWhere,
    ...(sp.channel ? { channel: sp.channel as 'ONLINE' } : {}),
    ...(sp.payment ? { paymentStatus: sp.payment as 'PAID' } : {}),
    ...(sp.q
      ? { OR: [{ number: { contains: sp.q, mode: 'insensitive' } }, { customerName: { contains: sp.q, mode: 'insensitive' } }, { phone: { contains: sp.q.replace(/\D/g, '') || sp.q } }] }
      : {}),
  };
  const orders = await prisma.order.findMany({ where, include: { items: { select: { productName: true, quantity: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  const total = orders.filter((o) => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED').reduce((s, o) => s + n(o.total), 0);
  const sel = 'input w-auto py-2';

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'} · ${formatINR(total)} paid`}
        actions={
          <>
            <CsvButton
              filename="sales.csv"
              rows={[
                ['Order', 'Date', 'Channel', 'Customer', 'Phone', 'Products', 'Amount', 'Payment Method', 'Payment Status', 'Order Status', 'Cashier'],
                ...orders.map((o) => [o.number, formatDateTime(o.createdAt), o.channel, o.customerName, o.phone, o.items.map((i) => `${i.productName} x${i.quantity}`).join('; '), n(o.total), o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] : '', o.paymentStatus, ORDER_STATUS_LABEL[o.status], o.cashierName]),
              ]}
            />
            <Link href="/admin/sales/new" className="btn-primary px-4 py-2.5"><ScanLine size={15} /> New Counter Sale</Link>
          </>
        }
      />
      <DateRangeForm
        from={from}
        to={to}
        extra={
          <>
            <label><span className="label">Status</span>
              <select name="status" defaultValue={sp.status ?? ''} className={sel}>
                <option value="">All</option><option value="open">Pending (all)</option><option value="active">Confirmed (in progress)</option>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label><span className="label">Channel</span>
              <select name="channel" defaultValue={sp.channel ?? ''} className={sel}><option value="">All</option><option value="ONLINE">Online</option><option value="WHATSAPP">WhatsApp</option><option value="STORE">Store</option></select>
            </label>
            <label><span className="label">Payment</span>
              <select name="payment" defaultValue={sp.payment ?? ''} className={sel}><option value="">All</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="UNPAID">Unpaid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select>
            </label>
            <label><span className="label">Search</span><input name="q" defaultValue={sp.q} placeholder="Order, customer, phone" className="input py-2" /></label>
          </>
        }
      />
      <Card>
        {orders.length ? (
          <Table>
            <thead>
              <tr><Th>Order</Th><Th>Date</Th><Th>Customer</Th><Th>Products</Th><Th right>Amount</Th><Th>Channel</Th><Th>Payment</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-sand/40">
                  <Td>
                    <Link href={`/admin/sales/${o.id}`} className="font-medium text-wine">{o.number}</Link>
                    {o.needsAttention && <AlertTriangle size={13} className="ml-1 inline text-danger" aria-label="Needs attention" />}
                  </Td>
                  <Td className="text-[12.5px] whitespace-nowrap">{formatDateTime(o.createdAt)}</Td>
                  <Td>{o.customerName}<div className="text-[12px] text-muted">{o.phone}</div></Td>
                  <Td className="max-w-[240px] truncate text-[12.5px]">{o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}</Td>
                  <Td right>{formatINR(n(o.total))}</Td>
                  <Td><ChannelBadge channel={o.channel} /></Td>
                  <Td><PaymentBadge status={o.paymentStatus} />{o.paymentMethod && <div className="text-[11.5px] text-muted">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</div>}</Td>
                  <Td><OrderStatusBadge status={o.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No orders in this period" />
        )}
      </Card>
    </>
  );
}
