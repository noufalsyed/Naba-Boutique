'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingBag, Store, User } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { WhatsAppIcon } from '@/components/store/icons';
import { waLink } from '@/lib/whatsapp';

const ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/shop', label: 'Shop', Icon: Store },
  { href: '/categories', label: 'Categories', Icon: LayoutGrid },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
  { href: '/account', label: 'Account', Icon: User },
];

/** Bottom tab bar (mobile) and the floating WhatsApp button (all sizes). */
export function MobileChrome() {
  const pathname = usePathname();
  const { cartCount, cartBump, ready, config } = useStore();
  const onProduct = /^\/shop\/[^/]+\/[^/]+/.test(pathname);
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <a
        href={waLink(config.whatsappNumber, `Hi ${config.businessName}, I have a question.`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className={`fixed right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#1f8f4e] text-white shadow-[0_10px_30px_-8px_rgba(31,143,78,.7)] transition-transform hover:scale-105 md:right-6 md:bottom-6 ${onProduct ? 'bottom-[9.5rem]' : 'bottom-20'}`}
      >
        <WhatsAppIcon size={27} />
      </a>
      <nav aria-label="Mobile tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {ITEMS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] tracking-[0.06em] ${active(href) ? 'text-wine' : 'text-muted'}`}>
                <Icon size={20} strokeWidth={active(href) ? 1.9 : 1.5} />
                {label}
                {href === '/cart' && ready && cartCount > 0 && (
                  <span key={cartBump} className="absolute top-1.5 left-1/2 ml-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-wine px-1 text-[9px] text-ivory">
                    {cartCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
