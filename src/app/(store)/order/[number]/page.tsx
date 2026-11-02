import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { OrderDetails, OrderTimeline } from '@/components/store/order-details';
import { RetryPayment } from '@/components/store/retry-payment';
import { WhatsAppIcon } from '@/components/store/icons';
import { findOrderForCustomer } from '@/server/orders';
import { storeConfig } from '@/server/config';
import { n } from '@/server/db';
import { formatINR } from '@/lib/format';
import { cartOrderMessage, waLink } from '@/lib/whatsapp';

export const metadata: Metadata = { title: 'Your Order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string; payment?: string; via?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const sp = await searchParams;
  const order = await findOrderForCustomer(decodeURIComponent(number), { accessKey: sp.key });
  if (!order) notFound();
  const cfg = storeConfig();

  const waText = cartOrderMessage(cfg.businessName, {
    orderNumber: order.number,
    customerName: order.customerName,
    phone: order.phone,
    lines: order.items.map((i) => ({ name: i.productName, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, price: n(i.price) })),
    subtotal: n(order.subtotal),
    shipping: n(order.shipping),
    total: n(order.total),
    address: [order.address, order.city, order.state, order.pincode].filter(Boolean).join(', '),
  });
  const waOrder = waLink(cfg.whatsappNumber, waText);
  const waChat = waLink(cfg.whatsappNumber, `Hi ${cfg.businessName}, I have a question about my order ${order.number}.`);
  const trackHref = `/track?order=${order.number}&phone=${order.phone}`;

  const paid = order.paymentStatus === 'PAID';
  const online = order.channel === 'ONLINE';
  const failed = online && !paid && order.status !== 'CANCELLED' && (sp.payment === 'failed' || order.paymentStatus === 'FAILED');
  const pending = online && !paid && !failed && order.status !== 'CANCELLED';

  return (
    <div className="container-x max-w-4xl py-10 md:py-14">
      <div className="text-center">
        {paid ? (
          <>
            <CheckCircle2 size={52} strokeWidth={1.2} className="mx-auto animate-pop text-success" />
            <h1 className="mt-4 text-[40px] md:text-[52px]">Order Confirmed!</h1>
            <p className="mt-2 text-muted">
              Thank you, {order.customerName.split(' ')[0]}. Your payment of {formatINR(n(order.total))} was received.
            </p>
            <p className="mt-1 text-[14px] text-muted">Estimated delivery: {cfg.estimatedDelivery}. We will update you on WhatsApp.</p>
          </>
        ) : failed ? (
          <>
            <XCircle size={52} strokeWidth={1.2} className="mx-auto text-danger" />
            <h1 className="mt-4 text-[40px] md:text-[52px]">Payment Failed</h1>
            <p className="mx-auto mt-2 max-w-md text-muted">Your payment did not go through and no money was taken. Your items are held for a little while — try again or order on WhatsApp.</p>
          </>
        ) : pending ? (
          <>
            <Clock size={52} strokeWidth={1.2} className="mx-auto text-warn" />
            <h1 className="mt-4 text-[40px] md:text-[52px]">Awaiting Payment</h1>
            <p className="mx-auto mt-2 max-w-md text-muted">We have not received confirmation of your payment yet. If money was debited, it will be confirmed automatically within a few minutes.</p>
          </>
        ) : order.status === 'CANCELLED' ? (
          <>
            <XCircle size={52} strokeWidth={1.2} className="mx-auto text-muted" />
            <h1 className="mt-4 text-[40px] md:text-[52px]">Order Cancelled</h1>
          </>
        ) : (
          <>
            <WhatsAppIcon size={50} className="mx-auto text-[#1f8f4e]" />
            <h1 className="mt-4 text-[40px] md:text-[52px]">Order Placed</h1>
            <p className="mx-auto mt-2 max-w-md text-muted">
              {sp.via === 'whatsapp' ? 'One last step: send your order to us on WhatsApp. We will confirm availability and share payment details.' : 'Our team will confirm your order on WhatsApp shortly.'}
            </p>
          </>
        )}
        <p className="mt-4 inline-block border border-line bg-white px-4 py-2 text-[13px] tracking-wide">
          Order Number <span className="ml-1 font-medium">{order.number}</span>
        </p>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {failed || pending ? (
          <>
            <RetryPayment number={order.number} accessKey={order.accessKey} label={failed ? 'Try Again' : 'Pay Now'} />
            <a href={waOrder} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-4">
              <WhatsAppIcon size={18} /> Order via WhatsApp
            </a>
          </>
        ) : order.channel === 'WHATSAPP' && !paid && order.status !== 'CANCELLED' ? (
          <>
            <a href={waOrder} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-4">
              <WhatsAppIcon size={18} /> Send Order on WhatsApp
            </a>
            <Link href="/shop" className="btn-outline px-8 py-4">Continue Shopping</Link>
          </>
        ) : (
          <>
            <Link href={trackHref} className="btn-dark px-8 py-4">Track Order</Link>
            <Link href="/shop" className="btn-outline px-8 py-4">Continue Shopping</Link>
            <a href={waChat} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-4">
              <WhatsAppIcon size={18} /> Chat on WhatsApp
            </a>
          </>
        )}
      </div>

      {(paid || order.channel !== 'ONLINE') && order.status !== 'CANCELLED' && (
        <div className="mx-auto mt-10 max-w-lg">
          <OrderTimeline order={order} />
        </div>
      )}
      <div className="mt-12">
        <OrderDetails order={order} />
      </div>
    </div>
  );
}
