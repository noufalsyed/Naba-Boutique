import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { BRAND, BRAND_QUOTE } from '@/lib/constants';
import { storeConfig } from '@/server/config';
import './globals.css';

// Self-hosted (Fontsource, SIL Open Font License, see ./fonts) so builds never
// depend on reaching Google Fonts. Variable fonts: one file covers every weight.
const serif = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-wght-normal.woff2', weight: '300 700', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-wght-italic.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
const sans = localFont({
  src: './fonts/jost-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-jost',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
});

export function generateMetadata(): Metadata {
  const { appUrl } = storeConfig();
  return {
    metadataBase: new URL(appUrl),
    title: { default: `${BRAND} | Ladies Chudidhar, Dress Materials & Custom Stitching`, template: `%s | ${BRAND}` },
    description:
      `${BRAND} — “${BRAND_QUOTE}”. Shop elegant ladies chudidhars, dress materials, ethnic wear and fabrics from Kerala, with made-to-measure stitching. Pay by UPI or card, or order on WhatsApp.`,
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
