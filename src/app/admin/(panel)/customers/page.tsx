import Link from 'next/link';
import { Card, CsvButton, EmptyState, PageHeader } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDate, formatINR } from '@/lib/format';

export const metadata = { title: 'Customers' };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const term = q?.trim();
  const customers = await prisma.customer.findMany({
    where: term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: term.replace(/\D/g, '') || term } }, { email: { contains: term, mode: 'insensitive' } }] } : {},
    include: { orders: { where: { status: { not: 'CANCELLED' } }, select: { total: true, paymentStatus: true, createdAt: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });
  const rows = customers.map((c) => ({
    c,
    orders: c.orders.length,
    spent: c.orders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + n(o.total), 0),
    last: c.orders.reduce<Date | null>((a, o) => (!a || o.createdAt > a ? o.createdAt : a), null),
  }));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customer${rows.length === 1 ? '' : 's'} — created automatically from orders`}
        actions={<CsvButton filename="customers.csv" rows={[['Name', 'Phone', 'WhatsApp', 'Email', 'City', 'Orders', 'Total Spent', 'Last Order', 'Since'], ...rows.map(({ c, orders, spent, last }) => [c.name, c.phone, c.whatsapp, c.email, c.city, orders, spent, last ? formatDate(last) : '', formatDate(c.createdAt)])]} />}
      />
      <form method="get" className="mb-4 flex gap-2">
        <input name="q" defaultValue={term} placeholder="Search name, phone or email" className="input max-w-sm py-2" />
        <button className="btn-dark px-5 py-2">Search</button>
      </form>
      <Card>
        {rows.length ? (
          <Table>
            <thead><tr><Th>Customer</Th><Th>Phone</Th><Th>City</Th><Th right>Orders</Th><Th right>Total Spent</Th><Th>Last Order</Th><Th>Since</Th></tr></thead>
            <tbody>
              {rows.map(({ c, orders, spent, last }) => (
                <tr key={c.id} className="hover:bg-sand/40">
                  <Td><Link href={`/admin/sales?q=${c.phone}&from=2020-01-01`} className="font-medium hover:text-wine">{c.name}</Link>{c.email && <div className="text-[12px] text-muted">{c.email}</div>}</Td>
                  <Td>{c.phone}{c.whatsapp && c.whatsapp !== c.phone && <div className="text-[12px] text-muted">WA {c.whatsapp}</div>}</Td>
                  <Td>{c.city ?? '—'}</Td>
                  <Td right>{orders}</Td>
                  <Td right>{formatINR(spent)}</Td>
                  <Td>{last ? formatDate(last) : '—'}</Td>
                  <Td>{formatDate(c.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No customers found" />
        )}
      </Card>
    </>
  );
}
