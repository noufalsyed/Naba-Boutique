import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { PurchaseForm } from '@/components/admin/purchase-form';
import { requireAdmin } from '@/server/auth/guard';
import { emptyPurchase, purchaseFormOptions } from '@/server/purchase-form-data';

export const metadata = { title: 'New Purchase' };

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ supplier?: string }> }) {
  await requireAdmin('ADMIN');
  const { supplier } = await searchParams;
  const { suppliers, categories } = await purchaseFormOptions();
  return (
    <>
      <PageHeader title="New Stock Purchase" subtitle="Record stock received from a supplier." back={{ href: '/admin/purchases', label: 'Purchases' }} />
      {suppliers.length ? (
        <PurchaseForm initial={emptyPurchase(supplier)} suppliers={suppliers} categories={categories} />
      ) : (
        <p className="text-muted">
          Add a supplier first. <Link href="/admin/suppliers" className="text-wine underline">Go to Suppliers</Link>
        </p>
      )}
    </>
  );
}
