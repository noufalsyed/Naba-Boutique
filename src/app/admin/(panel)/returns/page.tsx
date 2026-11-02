import Link from 'next/link';
import { Card, CsvButton, EmptyState, PageHeader } from '@/components/admin/ui';
import { DateRangeForm, Table, Td, Th } from '@/components/admin/table';
import { ReturnLauncher } from '@/components/admin/return-launcher';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDateTime, formatINR, istDateString, istRange } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';

export const metadata = { title: 'Returns' };

type SP = Promise<{ from?: string; to?: string; order?: string }>;

export default async function ReturnsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const from = sp.from ?? istDateString(new Date(Date.now() - 30 * 86_400_000));
  const { start, end, to } = istRange(from, sp.to);
  const orderNo = sp.order?.trim().toUpperCase();
  const [returns, order] = await Promise.all([
    prisma.salesReturn.findMany({ where: { createdAt: { gte: start, lt: end } }, include: { order: { select: { id: true, number: true, customerName: true } }, items: true }, orderBy: { createdAt: 'desc' } }),
    orderNo ? prisma.order.findUnique({ where: { number: orderNo }, include: { items: true } }) : null,
  ]);
  const returnable = order && order.stockState === 'COMMITTED' && order.status !== 'CANCELLED' && order.items.some((i) => i.quantity > i.returnedQty);

  return (
    <>
      <PageHeader
        title="Returns"
        subtitle="Returned items go back into stock and are recorded as Sales Return."
        actions={<CsvButton filename="returns.csv" rows={[['Return', 'Date', 'Order', 'Customer', 'Units', 'Refund', 'Method', 'Reason', 'By'], ...returns.map((r) => [r.number, formatDateTime(r.createdAt), r.order.number, r.order.customerName, r.items.reduce((s, i) => s + i.quantity, 0), n(r.refundAmount), PAYMENT_METHOD_LABEL[r.refundMethod], r.reason, r.createdByName])]} />}
      />
      <Card title="New Return" className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-2 p-4">
          <label><span className="label">Order number</span><input name="order" defaultValue={orderNo} required placeholder="FTS-2026-00012" className="input py-2" /></label>
          <button className="btn-dark px-5 py-2.5">Find Order</button>
        </form>
        {orderNo && (
          <div className="border-t border-line p-4 text-[14px]">
            {!order ? (
              <p className="text-danger">No order {orderNo} found.</p>
            ) : returnable ? (
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  <Link href={`/admin/sales/${order.id}`} className="font-medium text-wine">{order.number}</Link> — {order.customerName} · {formatINR(n(order.total))} · {order.items.length} item(s)
                </span>
                <ReturnLauncher orderId={order.id} items={order.items.map((i) => ({ id: i.id, productName: i.productName, sku: i.sku, size: i.size, quantity: i.quantity, returnedQty: i.returnedQty, price: n(i.price) }))} />
              </div>
            ) : (
              <p className="text-warn">Order {order.number} cannot be returned (it is not a completed sale, or everything has already been returned).</p>
            )}
          </div>
        )}
      </Card>
      <DateRangeForm from={from} to={to} />
      <Card>
        {returns.length ? (
          <Table>
            <thead><tr><Th>Return</Th><Th>Date</Th><Th>Order</Th><Th>Customer</Th><Th right>Units</Th><Th right>Refund</Th><Th>Method</Th><Th>Reason</Th><Th>By</Th></tr></thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.number}</Td>
                  <Td className="text-[12.5px] whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
                  <Td><Link href={`/admin/sales/${r.order.id}`} className="text-wine">{r.order.number}</Link></Td>
                  <Td>{r.order.customerName}</Td>
                  <Td right>{r.items.reduce((s, i) => s + i.quantity, 0)}</Td>
                  <Td right>{formatINR(n(r.refundAmount))}</Td>
                  <Td>{PAYMENT_METHOD_LABEL[r.refundMethod]}</Td>
                  <Td>{r.reason ?? '—'}</Td>
                  <Td>{r.createdByName}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No returns in this period" />
        )}
      </Card>
    </>
  );
}
