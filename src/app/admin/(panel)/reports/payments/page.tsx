import { Card, CsvButton, PageHeader, PrintButton } from '@/components/admin/ui';
import { DateRangeForm, StatCard, Table, Td, Th } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { paymentReport } from '@/server/reports';
import { formatINR } from '@/lib/format';

export const metadata = { title: 'Payment Report' };

export default async function PaymentReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const r = await paymentReport(await searchParams);
  return (
    <>
      <PageHeader
        title="Payment Report"
        subtitle={`${r.from} to ${r.to} · paid sales by how they were paid; WhatsApp orders shown on their own line`}
        actions={
          <>
            <CsvButton filename={`payments-${r.from}-${r.to}.csv`} rows={[['Method', 'Orders', 'Amount', 'Refunds', 'Net'], ...r.rows.map((x) => [x.method, x.count, x.amount, x.refunds, x.net])]} />
            <PrintButton />
          </>
        }
      />
      <DateRangeForm from={r.from} to={r.to} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Paid orders" value={r.totals.count} />
        <StatCard label="Collected" value={formatINR(r.totals.amount)} tone="wine" />
        <StatCard label="Refunded" value={formatINR(r.totals.refunds)} />
      </div>
      <Card>
        <Table>
          <thead><tr><Th>Method</Th><Th right>Orders</Th><Th right>Amount</Th><Th right>Refunds</Th><Th right>Net</Th></tr></thead>
          <tbody>
            {r.rows.map((x) => (
              <tr key={x.method}>
                <Td className="font-medium">{x.method}</Td>
                <Td right>{x.count}</Td>
                <Td right>{formatINR(x.amount)}</Td>
                <Td right className={x.refunds ? 'text-danger' : ''}>{x.refunds ? `−${formatINR(x.refunds)}` : '—'}</Td>
                <Td right className="font-medium">{formatINR(x.net)}</Td>
              </tr>
            ))}
            <tr className="bg-sand/50 font-medium">
              <Td>Total</Td>
              <Td right>{r.totals.count}</Td>
              <Td right>{formatINR(r.totals.amount)}</Td>
              <Td right>{r.totals.refunds ? `−${formatINR(r.totals.refunds)}` : '—'}</Td>
              <Td right>{formatINR(r.totals.amount - r.totals.refunds)}</Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </>
  );
}
