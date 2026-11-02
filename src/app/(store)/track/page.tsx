import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { PackageSearch } from 'lucide-react';
import { OrderDetails, OrderTimeline } from '@/components/store/order-details';
import { findOrderForCustomer } from '@/server/orders';
import { rateLimit } from '@/server/rate-limit';

export const metadata: Metadata = { title: 'Track Your Order', description: 'Check the status of your NABA Boutique order.', alternates: { canonical: '/track' } };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ order?: string; phone?: string }> };

export default async function TrackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const number = sp.order?.trim().toUpperCase().slice(0, 30);
  const phone = sp.phone?.replace(/\D/g, '').slice(-10);
  let order = null;
  let error = '';
  if (number && phone) {
    const h = await headers();
    const ip = h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    if (!rateLimit(`track:${ip}`, 30, 10 * 60_000).ok) error = 'Too many lookups. Please try again in a few minutes.';
    else {
      order = await findOrderForCustomer(number, { phone });
      if (!order) error = 'We could not find an order with that number and mobile number.';
    }
  }

  return (
    <div className="container-x max-w-4xl py-10 md:py-14">
      <div className="text-center">
        <PackageSearch size={40} strokeWidth={1.2} className="mx-auto text-wine" />
        <h1 className="mt-3 text-[40px] md:text-[50px]">Track Your Order</h1>
        <p className="mt-1 text-muted">Enter your order number and the mobile number used at checkout.</p>
      </div>
      <form method="get" className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input name="order" defaultValue={number} required placeholder="NB-2026-00001" aria-label="Order number" className="input" />
        <input name="phone" defaultValue={phone} required inputMode="numeric" placeholder="Mobile number" aria-label="Mobile number" className="input" />
        <button className="btn-primary">Track</button>
      </form>
      {error && <p className="mt-6 text-center text-danger">{error}</p>}
      {order && (
        <div className="mt-12 space-y-10">
          <div className="mx-auto max-w-lg">
            <OrderTimeline order={order} />
          </div>
          <OrderDetails order={order} />
        </div>
      )}
    </div>
  );
}
