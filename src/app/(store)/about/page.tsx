import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/store/info-page';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'NABA Boutique is a Kerala boutique for ladies chudidhars, dress materials, ethnic wear and customized stitching.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <InfoPage title="Clothes that feel like a second skin" eyebrow="About NABA Boutique" path="/about">
      <p>
        NABA Boutique began with a simple belief, captured in our signature line <em>“Feathers – The 2nd Skin”</em>: what you wear every day should feel as light and natural as your own skin. We are a
        small ladies fashion boutique from Kerala, choosing every chudidhar, dress material and fabric for comfort first and beauty always.
      </p>
      <h2>What we do</h2>
      <ul>
        <li><strong>Ready-to-wear chudidhars and ethnic wear</strong> in breathable cottons, rayons and festive silks.</li>
        <li><strong>Premium dress materials</strong> — georgette, chanderi, chikankari and party wear sets.</li>
        <li><strong>Fabrics</strong> including pure cotton, linen blends and traditional Kerala kasavu.</li>
        <li><strong>Customized stitching</strong> — your material, your measurements, your design.</li>
      </ul>
      <h2>Why customers choose us</h2>
      <p>
        We know that the right fit changes everything. That is why our tailoring team stitches to your exact measurements, and why we are always
        a WhatsApp message away to help with sizes, colours and styling.
      </p>
      <p>
        Follow our new arrivals on Instagram, order online with UPI or card, or simply send us a message on WhatsApp — whichever is easiest for you.
      </p>
      <p>
        <Link href="/shop">Explore the collection</Link> or <Link href="/customized-stitching">request custom stitching</Link>.
      </p>
    </InfoPage>
  );
}
