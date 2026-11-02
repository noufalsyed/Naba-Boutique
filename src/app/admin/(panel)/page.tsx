import Link from 'next/link';
import { AlertTriangle, Plus, ScanLine } from 'lucide-react';
import { Card, PageHeader } from '@/components/admin/ui';
import { StatCard, Table, Td, Th } from '@/components/admin/table';
import { ChannelBadge, OrderStatusBadge, PaymentBadge, StockBadge } from '@/components/admin/status';
import { dashboardStats, dailySummary } from '@/server/reports';
import { releaseExpiredReservations } from '@/server/orders';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDateTime, formatINR, formatNumber } from '@/lib/format';
import { stockStatus } from '@/lib/pricing';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin();
  await releaseExpiredReservations().catch(() => {});
  const [s, today, recent, lowRows, attention, sp] = await Promise.all([
    dashboardStats(),
    dailySummary(),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.$queryRaw<{ id: string; sku: string; size: string; color: string; stock: number; reserved: number; lowStockLevel: number; name: string; productId: string }[]>`
      SELECT v.id, v.sku, v.size, v.color, v.stock, v.reserved, v."lowStockLevel", p.name, p.id AS "productId"
      FROM product_variants v JOIN products p ON p.id = v."productId"
      WHERE v."isActive" AND p.status = 'ACTIVE' AND v.stock - v.reserved <= v."lowStockLevel"
      ORDER BY v.stock - v.reserved ASC, p.name LIMIT 8`,
    prisma.order.findMany({ where: { needsAttention: { not: null }, status: { not: 'CANCELLED' } }, take: 5 }),
    searchParams,
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin.name.split(' ')[0]}`}
        subtitle="Here is how the store is doing."
        actions={
          <>
            <Link href="/admin/sales/new" className="btn-primary px-4 py-2.5"><ScanLine size={15} /> New Sale</Link>
            {admin.role === 'ADMIN' && <Link href="/admin/purchases/new" className="btn-outline px-4 py-2.5"><Plus size={15} /> New Purchase</Link>}
          </>
        }
      />
      {sp.denied && <p className="mb-4 border border-warn/40 bg-warn/5 px-4 py-2.5 text-[14px] text-warn">That page is for administrators only.</p>}
      {attention.length > 0 && (
        <div className="mb-5 border border-danger/30 bg-danger/5 p-4">
          <p className="flex items-center gap-2 font-medium text-danger"><AlertTriangle size={16} /> Orders needing attention</p>
          <ul className="mt-2 space-y-1 text-[13.5px]">
            {attention.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/sales/${o.id}`} className="font-medium underline">{o.number}</Link> — {o.needsAttention}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Orders" value={formatNumber(s.total)} href="/admin/sales" />
        <StatCard label="Pending Orders" value={formatNumber(s.pending)} href="/admin/sales?status=open" tone={s.pending ? 'warn' : 'default'} hint="Awaiting confirmation or payment" />
        <StatCard label="Confirmed Orders" value={formatNumber(s.confirmed)} href="/admin/sales?status=active" hint="Paid / processing / shipping" />
        <StatCard label="Completed Orders" value={formatNumber(s.completed)} href="/admin/sales?status=DELIVERED" />
        <StatCard label="Revenue" value={formatINR(s.revenue)} hint="All paid orders" tone="wine" href="/admin/reports/sales" />
        <StatCard label="Products" value={formatNumber(s.products)} href="/admin/products" />
        <StatCard label="Low Stock" value={formatNumber(s.lowStock)} href="/admin/stock?status=low" tone={s.lowStock ? 'warn' : 'default'} hint="SKUs at or below their level" />
        <StatCard label="Stitching Requests" value={formatNumber(s.stitching)} href="/admin/stitching" hint="Open requests" />
      </div>

      <Card title="Today" className="mt-5" actions={<Link href="/admin/reports/daily" className="text-[12px] text-wine">Daily summary →</Link>}>
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:grid-cols-7">
          {[
            ['Sales', formatINR(today.sales)],
            ['Orders', today.orders],
            ['Items sold', today.itemsSold],
            ['Cash', formatINR(today.cash)],
            ['UPI', formatINR(today.upi)],
            ['Card', formatINR(today.card)],
            ['Online', formatINR(today.online)],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-white px-4 py-3">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[17px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Card title="Recent Orders" className="xl:col-span-3" actions={<Link href="/admin/sales" className="text-[12px] text-wine">All sales →</Link>}>
          <Table>
            <thead>
              <tr><Th>Order</Th><Th>Customer</Th><Th>Channel</Th><Th right>Amount</Th><Th>Payment</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-sand/40">
                  <Td><Link href={`/admin/sales/${o.id}`} className="font-medium text-wine">{o.number}</Link><div className="text-[11.5px] text-muted">{formatDateTime(o.createdAt)}</div></Td>
                  <Td>{o.customerName}</Td>
                  <Td><ChannelBadge channel={o.channel} /></Td>
                  <Td right>{formatINR(n(o.total))}</Td>
                  <Td><PaymentBadge status={o.paymentStatus} /></Td>
                  <Td><OrderStatusBadge status={o.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Low Stock" className="xl:col-span-2" actions={<Link href="/admin/stock?status=low" className="text-[12px] text-wine">Stock →</Link>}>
          <Table>
            <thead><tr><Th>Product</Th><Th right>Available</Th><Th>Status</Th></tr></thead>
            <tbody>
              {lowRows.length ? lowRows.map((v) => (
                <tr key={v.id}>
                  <Td><Link href={`/admin/products/${v.productId}`} className="hover:text-wine">{v.name}</Link><div className="text-[11.5px] text-muted">{v.sku} · {v.size}{v.color ? ` · ${v.color}` : ''}</div></Td>
                  <Td right>{v.stock - v.reserved}</Td>
                  <Td><StockBadge status={stockStatus(v.stock - v.reserved, v.lowStockLevel)} /></Td>
                </tr>
              )) : <tr><Td colSpan={3} className="text-muted">All stock levels are healthy.</Td></tr>}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
