import type { Metadata } from 'next';
import { InfoPage } from '@/components/store/info-page';
import { publicConfig } from '@/server/config';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'How Feathers – The 2nd Skin collects, uses and protects your information.', alternates: { canonical: '/privacy-policy' } };

export default function PrivacyPage() {
  const c = publicConfig();
  return (
    <InfoPage title="Privacy Policy" path="/privacy-policy" updated="November 2026">
      <p>This policy explains what information we collect when you shop with Feathers – The 2nd Skin and how we use it.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Your name, mobile and WhatsApp number, email and delivery address when you place an order.</li>
        <li>Measurements, design notes and images you send with a custom stitching request.</li>
        <li>Order details such as products, sizes and amounts.</li>
        <li>Your cart, wishlist and saved checkout details are stored only in your own browser.</li>
      </ul>
      <h2>Payments</h2>
      <p>
        Online payments are processed by our payment gateway. Your card, UPI and bank details are entered on the gateway&apos;s secure page; we never
        see or store them. We keep only the transaction reference returned by the gateway.
      </p>
      <h2>How we use your information</h2>
      <ul>
        <li>To process, deliver and support your orders and stitching requests.</li>
        <li>To contact you on WhatsApp, phone or email about your order.</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <p>We do not sell your personal information. We share it only with delivery partners and the payment gateway, as needed to fulfil your order.</p>
      <h2>Your choices</h2>
      <p>You may ask us to correct or delete your personal information by contacting us{c.email ? ` at ${c.email}` : ''} or on WhatsApp.</p>
      <h2>Security</h2>
      <p>Our website uses HTTPS encryption, and access to customer data is restricted to authorised staff.</p>
    </InfoPage>
  );
}
