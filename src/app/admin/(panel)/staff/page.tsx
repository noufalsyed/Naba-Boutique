import { Badge, Card, PageHeader } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { StaffButton } from '@/components/admin/staff-forms';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Staff' };

export default async function StaffPage() {
  await requireAdmin('ADMIN');
  const staff = await prisma.adminUser.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  return (
    <>
      <PageHeader title="Staff" subtitle="People who can sign in to the back office." actions={<StaffButton />} />
      <Card>
        <Table>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Last sign-in</Th><Th /></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td>{s.email}</Td>
                <Td><Badge tone={s.role === 'ADMIN' ? 'wine' : 'blue'}>{s.role === 'ADMIN' ? 'Admin' : 'Cashier'}</Badge></Td>
                <Td>{s.isActive ? (s.lockedUntil && s.lockedUntil > new Date() ? <Badge tone="red">Locked</Badge> : <Badge tone="green">Active</Badge>) : <Badge>Disabled</Badge>}</Td>
                <Td className="text-[12.5px]">{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : 'Never'}</Td>
                <Td><StaffButton staff={{ id: s.id, name: s.name, email: s.email, role: s.role, isActive: s.isActive }} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
