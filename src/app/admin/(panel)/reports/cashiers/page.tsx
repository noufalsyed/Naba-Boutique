import { Card, CsvButton, EmptyState, PageHeader, PrintButton } from '@/components/admin/ui';
import { DateRangeForm, Table, Td, Th } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { cashierReport } from '@/server/reports';
import { formatINR } from '@/lib/format';

export const metadata = { title: 'Cashier Report' };

export default async function CashierReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const r = await cashierReport(await searchParams);
  return (
    <>
      <PageHeader
        title="Cashier Report"
        subtitle={`${r.from} to ${r.to} · paid sales by the staff member who made or confirmed them ("Online" = website payments)`}
        actions={
          <>
            <CsvButton filename={`cashiers-${r.from}-${r.to}.csv`} rows={[['Cashier', 'Orders', 'Total Sales', 'Cash', 'Card', 'UPI', 'Online', 'Returns'], ...r.rows.map((x) => [x.cashier, x.orders, x.total, x.cash, x.card, x.upi, x.online, x.returns])]} />
            <PrintButton />
          </>
        }
      />
      <DateRangeForm from={r.from} to={r.to} />
      <Card>
        {r.rows.length ? (
          <Table>
            <thead><tr><Th>Cashier</Th><Th right>Orders</Th><Th right>Total Sales</Th><Th right>Cash</Th><Th right>Card</Th><Th right>UPI</Th><Th right>Online</Th><Th right>Returns</Th></tr></thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.cashier}>
                  <Td className="font-medium">{x.cashier}</Td>
                  <Td right>{x.orders}</Td>
                  <Td right className="font-medium">{formatINR(x.total)}</Td>
                  <Td right>{formatINR(x.cash)}</Td>
                  <Td right>{formatINR(x.card)}</Td>
                  <Td right>{formatINR(x.upi)}</Td>
                  <Td right>{formatINR(x.online)}</Td>
                  <Td right className={x.returns ? 'text-danger' : ''}>{x.returns ? `−${formatINR(x.returns)}` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No paid sales in this period" />
        )}
      </Card>
    </>
  );
}
