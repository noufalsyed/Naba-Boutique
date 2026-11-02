import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';
import type { findOrderForCustomer } from '@/server/orders';
import { n } from '@/server/db';
import { formatDate, formatDateTime, formatINR } from '@/lib/format';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/constants';
import { productPath } from '@/lib/slug';

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof findOrderForCustomer>>>;

const STEPS = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export function OrderTimeline({ order }: { order: CustomerOrder }) {
  if (order.status === 'CANCELLED') return <p className="bg-danger/10 px-4 py-3 text-[14px] text-danger">This order was cancelled{order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}` : ''}.</p>;
  const rank: Record<string, number> = { PENDING: -1, PAYMENT_PENDING: -1, PAID: 0, CONFIRMED: 0, PROCESSING: 1, READY_TO_SHIP: 1, SHIPPED: 2, DELIVERED: 3 };
  const at = rank[order.status] ?? -1;
  return (
    <ol className="grid grid-cols-4 gap-1">
      {STEPS.map((s, i) => (
        <li key={s} className="text-center">
          <div className="flex items-center">
            <span className={`h-px flex-1 ${i === 0 ? 'opacity-0' : i <= at ? 'bg-wine' : 'bg-line'}`} />
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${i <= at ? 'border-wine bg-wine text-ivory' : 'border-line bg-white text-muted'}`}>{i <= at ? <Check size={14} /> : i + 1}</span>
            <span className={`h-px flex-1 ${i === STEPS.length - 1 ? 'opacity-0' : i < at ? 'bg-wine' : 'bg-line'}`} />
          </div>
          <p className={`mt-1.5 text-[11px] uppercase tracking-[0.08em] ${i <= at ? 'text-charcoal' : 'text-muted'}`}>{ORDER_STATUS_LABEL[s]}</p>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetails({ order }: { order: CustomerOrder }) {
  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-3">
        <h2 className="mb-3 text-2xl">Items</h2>
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((i) => {
            const prod = i.variant.product;
            return (
              <li key={i.id} className="flex gap-3 py-3">
                <Link href={productPath(prod.category.slug, prod.slug)} className="relative aspect-[4/5] w-16 shrink-0 bg-sand">
                  {prod.images[0] && <Image src={prod.images[0].url} alt="" fill sizes="64px" className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="font-medium">{i.productName}</p>
                  <p className="text-[12.5px] text-muted">
                    {i.size}
                    {i.color ? ` · ${i.color}` : ''} · Qty {i.quantity} · SKU {i.sku}
                  </p>
                </div>
                <p className="text-[14px]">{formatINR(n(i.total))}</p>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-1.5 text-[14px]">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(n(order.subtotal))}</dd></div>
          {n(order.mrpTotal) > n(order.subtotal) && <div className="flex justify-between text-success"><dt>You saved</dt><dd>{formatINR(n(order.mrpTotal) - n(order.subtotal))}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{n(order.shipping) ? formatINR(n(order.shipping)) : 'Free'}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[16px] font-medium"><dt>Order Amount</dt><dd>{formatINR(n(order.total))}</dd></div>
        </dl>
      </div>
      <div className="space-y-5 text-[14px] md:col-span-2">
        <div className="bg-sand p-5">
          <h3 className="label">Order</h3>
          <p>
            <span className="font-medium">{order.number}</span> · {formatDateTime(order.createdAt)}
          </p>
          <p className="mt-1">Status: <span className="font-medium">{ORDER_STATUS_LABEL[order.status]}</span></p>
          <p>Payment: {PAYMENT_STATUS_LABEL[order.paymentStatus]}{order.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[order.paymentMethod]}` : ''}</p>
          <p>Channel: {CHANNEL_LABEL[order.channel]}</p>
          {order.trackingNumber && (
            <p className="mt-1">
              Tracking: {order.courier ? `${order.courier} · ` : ''}
              <span className="font-medium">{order.trackingNumber}</span>
            </p>
          )}
        </div>
        {order.address && (
          <div className="bg-sand p-5">
            <h3 className="label">Delivery Address</h3>
            <p className="font-medium">{order.customerName}</p>
            <p>{order.address}</p>
            <p>
              {order.city}, {order.state} – {order.pincode}
            </p>
            <p>{order.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}
