import { Card, CsvButton, PageHeader, PrintButton } from '@/components/admin/ui';
import { DateRangeForm, StatCard, Table, Td, Th } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { stockReport } from '@/server/reports';
import { formatINR, formatNumber, istDateString } from '@/lib/format';

export const metadata = { title: 'Stock Report' };

export default async function StockReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; moved?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const r = await stockReport({ from: sp.from ?? istDateString(new Date(Date.now() - 30 * 86_400_000)), to: sp.to });
  const rows = sp.moved === '1' ? r.rows.filter((x) => x.purchases || x.sales || x.returns || x.adjustments || x.purchaseReturns) : r.rows;
  const signed = (v: number) => (v ? (v > 0 ? `+${v}` : `${v}`) : '—');
  return (
    <>
      <PageHeader
        title="Stock Report"
        subtitle={`${r.from} to ${r.to} · Opening + purchases − sales + returns ± adjustments = closing`}
        actions={
          <>
            <CsvButton
              filename={`stock-report-${r.from}-${r.to}.csv`}
              rows={[['Product', 'SKU', 'Category', 'Size', 'Colour', 'Opening Stock', 'Purchases', 'Sales', 'Returns', 'Purchase Returns', 'Adjustments', 'Closing Stock', 'Current Stock', 'Stock Value (cost)'], ...rows.map((x) => [x.product, x.sku, x.category, x.size, x.color, x.opening, x.purchases, x.sales, x.returns, x.purchaseReturns, x.adjustments, x.closing, x.current, x.stockValue])]}
            />
            <PrintButton />
          </>
        }
      />
      <DateRangeForm
        from={r.from}
        to={r.to}
        extra={<label className="flex items-center gap-2 pb-2 text-[13px]"><input type="checkbox" name="moved" value="1" defaultChecked={sp.moved === '1'} className="accent-wine" /> Only SKUs with movement</label>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="SKUs" value={formatNumber(rows.length)} />
        <StatCard label="Units in stock now" value={formatNumber(r.totals.units)} />
        <StatCard label="Stock value (cost)" value={formatINR(Math.round(r.totals.stockValue))} tone="wine" />
        <StatCard label="Units sold in period" value={formatNumber(rows.reduce((s, x) => s + x.sales, 0))} />
      </div>
      <Card>
        <Table>
          <thead><tr><Th>Product</Th><Th>SKU</Th><Th right>Opening</Th><Th right>Purchases</Th><Th right>Sales</Th><Th right>Returns</Th><Th right>Pur. Returns</Th><Th right>Adjustments</Th><Th right>Closing</Th><Th right>Current</Th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.sku}>
                <Td>{x.product}<div className="text-[11.5px] text-muted">{x.size}{x.color ? ` · ${x.color}` : ''}</div></Td>
                <Td className="font-mono text-[12.5px]">{x.sku}</Td>
                <Td right>{x.opening}</Td>
                <Td right className="text-success">{x.purchases ? `+${x.purchases}` : '—'}</Td>
                <Td right className="text-danger">{x.sales ? `−${x.sales}` : '—'}</Td>
                <Td right className="text-success">{x.returns ? `+${x.returns}` : '—'}</Td>
                <Td right className="text-danger">{x.purchaseReturns ? `−${x.purchaseReturns}` : '—'}</Td>
                <Td right>{signed(x.adjustments)}</Td>
                <Td right className="font-medium">{x.closing}</Td>
                <Td right>{x.current}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
