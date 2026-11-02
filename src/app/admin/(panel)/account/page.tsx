import { PageHeader } from '@/components/admin/ui';
import { ChangePassword } from '@/components/admin/staff-forms';
import { requireAdmin } from '@/server/auth/guard';

export const metadata = { title: 'My Account' };

export default async function AccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="My Account" subtitle={`${admin.name} · ${admin.email} · ${admin.role === 'ADMIN' ? 'Admin' : 'Cashier'}`} />
      <ChangePassword />
    </>
  );
}
