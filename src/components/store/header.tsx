'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { Logo } from '@/components/store/logo';
import { useStore } from '@/components/store/store-provider';
import { InstagramIcon, WhatsAppIcon } from '@/components/store/icons';
import { waLink } from '@/lib/whatsapp';

const NAV = [
  { href: '/shop', label: 'Shop All' },
  { href: '/shop/chudidhars', label: 'Chudidhars' },
  { href: '/shop/dress-materials', label: 'Dress Materials' },
  { href: '/shop/ethnic-wear', label: 'Ethnic Wear' },
  { href: '/shop/fabrics', label: 'Fabrics' },
  { href: '/customized-stitching', label: 'Custom Stitching' },
];

export function Header() {
  const { cartCount, cartBump, wishlist, ready, config } = useStore();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <div className="bg-charcoal text-center text-[11px] tracking-[0.2em] text-ivory/90 uppercase">
        <p className="container-x py-2">
          Free shipping above ₹{config.shipping.freeAbove.toLocaleString('en-IN')} · Custom stitching available
        </p>
      </div>
      <header className={`sticky top-0 z-40 border-b transition-all duration-300 ${scrolled ? 'border-line bg-ivory/95 shadow-[0_6px_24px_-18px_rgba(42,38,36,.5)] backdrop-blur' : 'border-transparent bg-ivory'}`}>
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <div className="flex items-center gap-1 xl:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-2 p-2">
              <Menu size={22} strokeWidth={1.5} />
            </button>
            <button type="button" aria-label="Search" onClick={() => setSearchOpen((s) => !s)} className="p-2">
              <Search size={20} strokeWidth={1.5} />
            </button>
          </div>
          <Logo compact />
          <nav className="hidden items-center gap-7 whitespace-nowrap xl:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`relative text-[12px] font-medium uppercase tracking-[0.16em] transition-colors hover:text-wine after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-wine after:transition-all after:duration-300 ${pathname === n.href ? 'text-wine after:w-full' : 'after:w-0 hover:after:w-full'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Search" onClick={() => setSearchOpen((s) => !s)} className="hidden p-2 transition-colors hover:text-wine xl:block">
              <Search size={20} strokeWidth={1.5} />
            </button>
            <Link href="/account#wishlist" aria-label="Wishlist" className="relative hidden p-2 transition-colors hover:text-wine sm:block">
              <Heart size={20} strokeWidth={1.5} />
              {ready && wishlist.length > 0 && <span className="absolute top-1 right-0.5 h-2 w-2 rounded-full bg-rose" />}
            </Link>
            <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative -mr-2 p-2 transition-colors hover:text-wine">
              <ShoppingBag size={21} strokeWidth={1.5} />
              {ready && cartCount > 0 && (
                <span key={cartBump} className="absolute top-0.5 right-0 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-wine px-1 text-[10px] font-medium text-ivory">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        {searchOpen && (
          <div className="animate-fade-in border-t border-line bg-ivory">
            <form onSubmit={submit} className="container-x flex items-center gap-3 py-3" role="search">
              <Search size={18} className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search chudidhars, materials, colours…"
                className="flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted/70"
                aria-label="Search products"
              />
              <button type="submit" className="text-[11px] font-medium uppercase tracking-[0.18em] text-wine">
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 animate-fade-in bg-charcoal/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-ivory shadow-2xl [animation:slide-in-left_.3s_cubic-bezier(.2,.7,.2,1)_both]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo compact />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="-mr-2 p-2">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobile">
              {[...NAV, { href: '/shop?flag=new', label: 'New Arrivals' }, { href: '/shop?flag=best', label: 'Best Sellers' }, { href: '/categories', label: 'All Categories' }].map((n) => (
                <Link key={n.href} href={n.href} className="block border-b border-line/70 py-3.5 font-serif text-[22px] text-charcoal">
                  {n.label}
                </Link>
              ))}
              <div className="mt-6 space-y-3 text-[14px] text-muted">
                <Link href="/track" className="block">Track your order</Link>
                <Link href="/about" className="block">About us</Link>
                <Link href="/contact" className="block">Contact</Link>
                <Link href="/shipping-returns" className="block">Shipping & returns</Link>
              </div>
            </nav>
            <div className="flex gap-3 border-t border-line p-5">
              <a href={waLink(config.whatsappNumber, `Hi ${config.businessName}`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp flex-1 px-3">
                <WhatsAppIcon size={16} /> WhatsApp
              </a>
              <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-4" aria-label="Instagram">
                <InstagramIcon size={18} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
