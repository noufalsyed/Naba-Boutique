import Link from 'next/link';
import { Card, CsvButton, EmptyState, PageHeader, PrintButton } from '@/components/admin/ui';
import { DateRangeForm, StatCard, Table, Td, Th } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { salesReport } from '@/server/reports';
import { formatDateTime, formatINR } from '@/lib/format';
import { CHANNEL_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/constants';

export const metadata = { title: 'Sales Report' };

const method = (m: string) => PAYMENT_METHOD_LABEL[m] ?? (m === 'WHATSAPP' ? 'WhatsApp (unpaid)' : 'Unpaid');

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const r = await salesReport(sp);
  return (
    <>
      <PageHeader
        title="Sales Report"
        subtitle={`${r.from} to ${r.to} · confirmed sales only (cancelled and unconfirmed orders excluded)`}
        actions={
          <>
            <CsvButton filename={`sales-${r.from}-${r.to}.csv`} rows={[['Date', 'Order', 'Channel', 'Customer', 'Product', 'SKU', 'Size', 'Quantity', 'Returned', 'Sales Amount', 'Payment Method', 'Cashier'], ...r.rows.map((x) => [formatDateTime(x.date), x.order, CHANNEL_LABEL[x.channel], x.customer, x.product, x.sku, x.size, x.quantity, x.returned, x.amount, method(x.paymentMethod), x.cashier])]} />
            <PrintButton />
          </>
        }
      />
      <DateRangeForm from={r.from} to={r.to} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Orders" value={r.totals.orders} />
        <StatCard label="Items sold" value={r.totals.quantity} />
        <StatCard label="Product sales" value={formatINR(r.totals.amount)} />
        <StatCard label="Bill discounts" value={formatINR(r.totals.billDiscount)} />
        <StatCard label="Net (incl. shipping)" value={formatINR(r.totals.net)} tone="wine" />
      </div>
      <Card>
        {r.rows.length ? (
          <Table>
            <thead><tr><Th>Date</Th><Th>Order</Th><Th>Customer</Th><Th>Product</Th><Th right>Qty</Th><Th right>Amount</Th><Th>Payment</Th><Th>Cashier</Th></tr></thead>
            <tbody>
              {r.rows.map((x, i) => (
                <tr key={i}>
                  <Td className="text-[12.5px] whitespace-nowrap">{formatDateTime(x.date)}</Td>
                  <Td><Link href={`/admin/sales?q=${x.order}&from=${r.from}&to=${r.to}`} className="text-wine">{x.order}</Link><div className="text-[11px] text-muted">{CHANNEL_LABEL[x.channel]}</div></Td>
                  <Td>{x.customer}</Td>
                  <Td>{x.product}<div className="text-[11.5px] text-muted">{x.sku} · {x.size}</div></Td>
                  <Td right>{x.quantity}{x.returned ? <div className="text-[11px] text-danger">−{x.returned} ret.</div> : null}</Td>
                  <Td right>{formatINR(x.amount)}</Td>
                  <Td>{method(x.paymentMethod)}</Td>
                  <Td>{x.cashier}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No sales in this period" />
        )}
      </Card>
    </>
  );
}
