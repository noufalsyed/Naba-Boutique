import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/store/logo';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from '@/components/store/icons';
import { waLink } from '@/lib/whatsapp';
import type { PublicConfig } from '@/server/config';

const COLS = [
  {
    title: 'Shop',
    links: [
      { href: '/shop', label: 'Shop All' },
      { href: '/shop?flag=new', label: 'New Arrivals' },
      { href: '/shop?flag=best', label: 'Best Sellers' },
      { href: '/categories', label: 'Categories' },
    ],
  },
  {
    title: 'Categories',
    links: [
      { href: '/shop/chudidhars', label: 'Chudidhars' },
      { href: '/shop/dress-materials', label: 'Dress Materials' },
      { href: '/shop/ethnic-wear', label: 'Ethnic Wear' },
      { href: '/shop/fabrics', label: 'Fabrics' },
      { href: '/customized-stitching', label: 'Customized Stitching' },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/track', label: 'Track Order' },
      { href: '/shipping-returns', label: 'Shipping & Returns' },
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms & Conditions' },
    ],
  },
];

export function Footer({ config }: { config: PublicConfig }) {
  return (
    <footer className="mt-24 bg-charcoal pb-24 text-ivory/80 md:pb-0">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-5 max-w-xs text-[14px] leading-7 text-ivory/65">
            Elegant ethnic wear, premium dress materials and made-to-measure stitching — crafted to feel like your second skin.
          </p>
          <div className="mt-6 flex gap-3">
            <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/25 transition-colors hover:border-ivory hover:bg-ivory hover:text-charcoal">
              <InstagramIcon size={18} />
            </a>
            <a href={waLink(config.whatsappNumber, `Hi ${config.businessName}`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/25 transition-colors hover:border-ivory hover:bg-ivory hover:text-charcoal">
              <WhatsAppIcon size={18} />
            </a>
            {config.facebookUrl && (
              <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/25 transition-colors hover:border-ivory hover:bg-ivory hover:text-charcoal">
                <FacebookIcon size={18} />
              </a>
            )}
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="md:col-span-2">
            <h3 className="mb-4 font-sans text-[11px] font-medium uppercase tracking-[0.24em] text-ivory">{c.title}</h3>
            <ul className="space-y-2.5 text-[14px]">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-ivory">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="md:col-span-2">
          <h3 className="mb-4 font-sans text-[11px] font-medium uppercase tracking-[0.24em] text-ivory">Contact</h3>
          <ul className="space-y-3 text-[14px]">
            <li>
              <a href={waLink(config.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:text-ivory">
                <WhatsAppIcon size={15} className="mt-1 shrink-0" /> WhatsApp us
              </a>
            </li>
            {config.phone && (
              <li>
                <a href={`tel:${config.phone.replace(/\s/g, '')}`} className="flex items-start gap-2 hover:text-ivory">
                  <Phone size={15} className="mt-1 shrink-0" /> {config.phone}
                </a>
              </li>
            )}
            {config.email && (
              <li>
                <a href={`mailto:${config.email}`} className="flex items-start gap-2 break-all hover:text-ivory">
                  <Mail size={15} className="mt-1 shrink-0" /> {config.email}
                </a>
              </li>
            )}
            <li className="flex items-start gap-2">
              <MapPin size={15} className="mt-1 shrink-0" /> {config.address}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-[12px] text-ivory/50 md:flex-row">
          <p>© {new Date().getFullYear()} Feathers – The 2nd Skin. All rights reserved.</p>
          <p>Secure payments · UPI · Cards · Net Banking · Wallets</p>
        </div>
      </div>
    </footer>
  );
}
