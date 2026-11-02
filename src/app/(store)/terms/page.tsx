import type { Metadata } from 'next';
import { InfoPage } from '@/components/store/info-page';

export const metadata: Metadata = { title: 'Terms & Conditions', description: 'Terms and conditions for shopping at Feathers – The 2nd Skin.', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return (
    <InfoPage title="Terms & Conditions" path="/terms" updated="November 2026">
      <p>By using this website and placing an order, you agree to these terms.</p>
      <h2>Products and pricing</h2>
      <ul>
        <li>All prices are in Indian Rupees and include applicable taxes. Shipping is shown at checkout.</li>
        <li>Colours may vary slightly from photos because of lighting and screen settings. Handloom and hand-printed items have natural variations.</li>
        <li>We may correct pricing errors; if an order is affected we will contact you before dispatch and refund if you prefer.</li>
      </ul>
      <h2>Orders</h2>
      <ul>
        <li>An online order is confirmed only after the payment gateway confirms payment.</li>
        <li>WhatsApp orders are confirmed once our team verifies availability and payment.</li>
        <li>We may cancel an order if an item becomes unavailable; any payment will be fully refunded.</li>
      </ul>
      <h2>Customized stitching</h2>
      <ul>
        <li>Stitching is done to the measurements you provide and confirm. Please double-check them.</li>
        <li>Minor alterations within 7 days of delivery are free for fit issues caused by our tailoring.</li>
      </ul>
      <h2>Returns</h2>
      <p>Returns and refunds follow our Shipping & Returns policy.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, with courts in Kerala having jurisdiction.</p>
    </InfoPage>
  );
}
