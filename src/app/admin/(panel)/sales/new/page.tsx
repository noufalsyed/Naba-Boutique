import { PageHeader } from '@/components/admin/ui';
import { CounterSale } from '@/components/admin/counter-sale';
import { requireAdmin } from '@/server/auth/guard';

export const metadata = { title: 'New Sale' };

export default async function NewSalePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Counter Sale" subtitle="In-store sale. Stock is reduced as soon as the sale is completed." back={{ href: '/admin/sales', label: 'Sales' }} />
      <CounterSale />
    </>
  );
}
