import Link from 'next/link';
import { Card, CsvButton, EmptyState, PageHeader, PrintButton } from '@/components/admin/ui';
import { DateRangeForm, StatCard, Table, Td, Th } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { purchaseReport } from '@/server/reports';
import { formatDate, formatINR, istDateString } from '@/lib/format';

export const metadata = { title: 'Purchase Report' };

export default async function PurchaseReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin('ADMIN');
  const sp = await searchParams;
  const r = await purchaseReport({ from: sp.from ?? istDateString(new Date(Date.now() - 30 * 86_400_000)), to: sp.to });
  return (
    <>
      <PageHeader
        title="Purchase Report"
        subtitle={`${r.from} to ${r.to} · received purchases`}
        actions={
          <>
            <CsvButton filename={`purchases-${r.from}-${r.to}.csv`} rows={[['Date', 'Purchase ID', 'Invoice', 'Supplier', 'Product', 'SKU', 'Quantity', 'Purchase Amount'], ...r.rows.map((x) => [formatDate(x.date), x.purchase, x.invoice, x.supplier, x.product, x.sku, x.quantity, x.amount])]} />
            <PrintButton />
          </>
        }
      />
      <DateRangeForm from={r.from} to={r.to} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Purchases" value={r.totals.purchases} />
        <StatCard label="Units received" value={r.totals.quantity} />
        <StatCard label="Line value" value={formatINR(r.totals.amount)} />
        <StatCard label="Grand total" value={formatINR(r.totals.grandTotal)} hint="After discounts and charges" tone="wine" />
      </div>
      <Card>
        {r.rows.length ? (
          <Table>
            <thead><tr><Th>Date</Th><Th>Purchase ID</Th><Th>Supplier</Th><Th>Product</Th><Th right>Qty</Th><Th right>Amount</Th></tr></thead>
            <tbody>
              {r.rows.map((x, i) => (
                <tr key={i}>
                  <Td>{formatDate(x.date)}</Td>
                  <Td><Link href={`/admin/purchases?q=${x.purchase}&from=${r.from}&to=${r.to}`} className="text-wine">{x.purchase}</Link>{x.invoice && <div className="text-[11.5px] text-muted">Inv {x.invoice}</div>}</Td>
                  <Td>{x.supplier}</Td>
                  <Td>{x.product}<div className="text-[11.5px] text-muted">{x.sku}</div></Td>
                  <Td right>{x.quantity}</Td>
                  <Td right>{formatINR(x.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No purchases received in this period" />
        )}
      </Card>
    </>
  );
}
