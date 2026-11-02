import { Card, PageHeader, PrintButton } from '@/components/admin/ui';
import { StatCard } from '@/components/admin/table';
import { requireAdmin } from '@/server/auth/guard';
import { dailySummary } from '@/server/reports';
import { formatDate, formatINR } from '@/lib/format';

export const metadata = { title: 'Daily Summary' };

export default async function DailySummaryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const admin = await requireAdmin();
  const { date } = await searchParams;
  const d = await dailySummary(date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined);
  return (
    <>
      <PageHeader title="Daily Summary" subtitle={formatDate(`${d.date}T12:00:00+05:30`, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} actions={<PrintButton />} />
      <form method="get" className="no-print mb-5 flex items-end gap-2">
        <label><span className="label">Date</span><input type="date" name="date" defaultValue={d.date} className="input py-2" /></label>
        <button className="btn-dark px-5 py-2.5">Show</button>
      </form>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's sales" value={formatINR(d.sales)} tone="wine" />
        <StatCard label="Number of orders" value={d.orders} />
        <StatCard label="Items sold" value={d.itemsSold} />
        <StatCard label="New customers" value={d.newCustomers} />
      </div>
      <Card title="Collections" className="mt-5">
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Cash sales', d.cash],
            ['Card sales', d.card],
            ['UPI sales', d.upi],
            ['Online sales', d.online],
            ['WhatsApp orders', d.whatsapp],
            [`Returns (${d.returnCount})`, -d.returns],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-white px-4 py-3">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">{k}</dt>
              <dd className={`mt-0.5 text-[18px] font-medium ${Number(v) < 0 ? 'text-danger' : ''}`}>{formatINR(Number(v))}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {admin.role === 'ADMIN' && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Gross profit" value={formatINR(d.grossProfit)} hint="Sales minus purchase cost" />
          <StatCard label="Net after returns" value={formatINR(d.sales - d.returns)} />
        </div>
      )}
    </>
  );
}
