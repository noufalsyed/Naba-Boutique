import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import { PurchaseForm } from '@/components/admin/purchase-form';
import { requireAdmin } from '@/server/auth/guard';
import { prisma } from '@/server/db';
import { purchaseFormOptions, purchaseFormValue } from '@/server/purchase-form-data';

export const metadata = { title: 'Edit Purchase' };

export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('ADMIN');
  const { id } = await params;
  const p = await prisma.purchase.findUnique({ where: { id }, select: { status: true, number: true } });
  if (!p) notFound();
  if (p.status !== 'DRAFT') redirect(`/admin/purchases/${id}`);
  const [value, { suppliers, categories }] = await Promise.all([purchaseFormValue(id), purchaseFormOptions()]);
  return (
    <>
      <PageHeader title={`Edit ${p.number}`} back={{ href: `/admin/purchases/${id}`, label: p.number }} />
      <PurchaseForm initial={value!} suppliers={suppliers} categories={categories} />
    </>
  );
}
