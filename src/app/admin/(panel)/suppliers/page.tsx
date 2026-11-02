import Link from 'next/link';
import { Badge, Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { SupplierButton } from '@/components/admin/supplier-form';
import { prisma, n } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDate, formatINR } from '@/lib/format';

export const metadata = { title: 'Suppliers' };

export default async function SuppliersPage() {
  await requireAdmin('ADMIN');
  const suppliers = await prisma.supplier.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: { purchases: { where: { status: 'RECEIVED' }, select: { grandTotal: true, purchaseDate: true } }, _count: { select: { products: true } } },
  });
  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who you buy stock from." actions={<SupplierButton />} />
      <Card>
        {suppliers.length ? (
          <Table>
            <thead><tr><Th>Supplier</Th><Th>Contact</Th><Th>GSTIN</Th><Th right>Products</Th><Th right>Purchases</Th><Th right>Total Purchases</Th><Th>Last Purchase</Th><Th /></tr></thead>
            <tbody>
              {suppliers.map((s) => {
                const last = s.purchases.reduce<Date | null>((a, p) => (!a || p.purchaseDate > a ? p.purchaseDate : a), null);
                return (
                  <tr key={s.id} className="hover:bg-sand/40">
                    <Td>
                      <Link href={`/admin/suppliers/${s.id}`} className="font-medium hover:text-wine">{s.name}</Link>
                      {s.companyName && <div className="text-[12px] text-muted">{s.companyName}</div>}
                      {!s.isActive && <Badge>Inactive</Badge>}
                    </Td>
                    <Td>{s.phone ?? '—'}{s.email && <div className="text-[12px] text-muted">{s.email}</div>}</Td>
                    <Td className="font-mono text-[12px]">{s.gstin ?? '—'}</Td>
                    <Td right>{s._count.products}</Td>
                    <Td right>{s.purchases.length}</Td>
                    <Td right>{formatINR(s.purchases.reduce((a, p) => a + n(p.grandTotal), 0))}</Td>
                    <Td>{last ? formatDate(last) : '—'}</Td>
                    <Td><Link href={`/admin/purchases/new?supplier=${s.id}`} className="text-[12px] text-wine hover:underline">New purchase</Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No suppliers yet" hint="Add the people or companies you buy stock from." />
        )}
      </Card>
    </>
  );
}
