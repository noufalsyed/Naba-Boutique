import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { BRAND } from '@/lib/constants';
import { storeConfig } from '@/server/config';
import './globals.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
const sans = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-jost', display: 'swap' });

export function generateMetadata(): Metadata {
  const { appUrl } = storeConfig();
  return {
    metadataBase: new URL(appUrl),
    title: { default: `${BRAND} | Ladies Chudidhar, Dress Materials & Custom Stitching`, template: `%s | ${BRAND}` },
    description:
      'Shop elegant ladies chudidhars, dress materials, ethnic wear and fabrics from Kerala, with made-to-measure stitching. Pay by UPI or card, or order on WhatsApp.',
    applicationName: BRAND,
    openGraph: { type: 'website', siteName: BRAND, locale: 'en_IN' },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/icon.svg' },
  };
}

export const viewport: Viewport = {
  themeColor: '#fbf8f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
