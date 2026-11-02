import type { Metadata } from 'next';
import { InfoPage } from '@/components/store/info-page';
import { publicConfig } from '@/server/config';
import { formatINR } from '@/lib/format';

export const metadata: Metadata = { title: 'Shipping & Returns', description: 'Delivery times, shipping charges, returns and exchanges at Feathers – The 2nd Skin.', alternates: { canonical: '/shipping-returns' } };

export default function ShippingPage() {
  const c = publicConfig();
  return (
    <InfoPage title="Shipping & Returns" path="/shipping-returns" updated="November 2026">
      <h2>Shipping</h2>
      <ul>
        <li>We ship across India. Orders are dispatched within 1–2 working days of payment confirmation.</li>
        <li>Estimated delivery: {c.estimatedDelivery}.</li>
        <li>Shipping is {formatINR(c.shipping.flat)} per order, and free on orders of {formatINR(c.shipping.freeAbove)} or more.</li>
        <li>Customized stitching orders are dispatched 7–10 days after we confirm your measurements.</li>
        <li>You will receive tracking details on WhatsApp once your order ships. You can also check status on the Track Order page.</li>
      </ul>
      <h2>Returns & exchanges</h2>
      <ul>
        <li>Ready-to-wear items can be returned or exchanged within 7 days of delivery if unused, unwashed and with tags intact.</li>
        <li>Dress materials and fabrics can be returned only if uncut and unused.</li>
        <li>Customized and stitched-to-measure items cannot be returned, except for a manufacturing defect.</li>
        <li>To start a return, message us on WhatsApp with your order number and photos of the item.</li>
      </ul>
      <h2>Refunds</h2>
      <p>
        Once the returned item is received and checked, refunds are made to the original payment method within 5–7 working days. Shipping charges
        are non-refundable unless the item was damaged or incorrect.
      </p>
      <h2>Damaged or wrong item</h2>
      <p>Please share an unboxing photo or video on WhatsApp within 48 hours of delivery, and we will arrange a replacement or full refund.</p>
    </InfoPage>
  );
}
