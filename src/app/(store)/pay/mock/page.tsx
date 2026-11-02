import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma, n } from '@/server/db';
import { mockEnabled } from '@/server/payments/mock';
import { MockPay } from '@/components/store/mock-pay';

export const metadata: Metadata = { title: 'Test Payment', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Stand-in for the gateway's payment page while PAYMENT_GATEWAY=mock. */
export default async function MockPayPage({ searchParams }: { searchParams: Promise<{ po?: string; order?: string; key?: string }> }) {
  if (!mockEnabled()) notFound();
  const sp = await searchParams;
  const pay = sp.po ? await prisma.payment.findUnique({ where: { providerOrderId: sp.po }, include: { order: true } }) : null;
  if (!pay || pay.order.accessKey !== sp.key) notFound();
  return <MockPay providerOrderId={pay.providerOrderId} orderNumber={pay.order.number} accessKey={pay.order.accessKey} amount={n(pay.amount)} />;
}
