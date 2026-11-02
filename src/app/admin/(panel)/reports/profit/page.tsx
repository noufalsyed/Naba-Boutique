import { Card, CsvButton, EmptyState, PageHeader, PrintButton } from '@/components/admin/ui';
import { DateRangeForm, StatCard, Table, Td, Th } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { profitReport } from '@/server/reports';
import { formatINR } from '@/lib/format';

export const metadata = { title: 'Profit Report' };

export default async function ProfitReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin('ADMIN');
  const r = await profitReport(await searchParams);
  const margin = r.totals.sales ? Math.round((r.totals.profit / r.totals.sales) * 1000) / 10 : 0;
  return (
    <>
      <PageHeader
        title="Profit Report"
        subtitle={`${r.from} to ${r.to} · Gross profit = selling price − purchase cost (cost at time of sale; returned items excluded)`}
        actions={
          <>
            <CsvButton filename={`profit-${r.from}-${r.to}.csv`} rows={[['Product', 'Quantity Sold', 'Sales Value', 'Cost Value', 'Gross Profit', 'Margin %'], ...r.rows.map((x) => [x.product, x.quantity, x.sales, x.cost, x.profit, x.margin])]} />
            <PrintButton />
          </>
        }
      />
      <DateRangeForm from={r.from} to={r.to} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Quantity sold" value={r.totals.quantity} />
        <StatCard label="Sales value" value={formatINR(r.totals.sales)} />
        <StatCard label="Cost value" value={formatINR(r.totals.cost)} />
        <StatCard label="Gross profit" value={formatINR(r.totals.profit)} hint={`${margin}% margin`} tone="wine" />
      </div>
      <Card>
        {r.rows.length ? (
          <Table>
            <thead><tr><Th>Product</Th><Th right>Qty Sold</Th><Th right>Sales Value</Th><Th right>Cost Value</Th><Th right>Gross Profit</Th><Th right>Margin</Th></tr></thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.product}>
                  <Td className="font-medium">{x.product}</Td>
                  <Td right>{x.quantity}</Td>
                  <Td right>{formatINR(x.sales)}</Td>
                  <Td right>{formatINR(x.cost)}</Td>
                  <Td right className={x.profit < 0 ? 'text-danger' : 'font-medium text-success'}>{formatINR(x.profit)}</Td>
                  <Td right>{x.margin}%</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No sales in this period" />
        )}
      </Card>
      <p className="mt-3 text-[12.5px] text-muted">Products without a purchase cost show full profit. Set cost prices through purchases, Excel upload or the product form.</p>
    </>
  );
}
