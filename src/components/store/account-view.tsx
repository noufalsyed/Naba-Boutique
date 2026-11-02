'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Package, PackageSearch, Scissors } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { ProductCard } from '@/components/store/product-card';
import { ORDERS_KEY } from '@/components/store/checkout-view';
import { WhatsAppIcon } from '@/components/store/icons';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { waLink } from '@/lib/whatsapp';
import type { CardProduct } from '@/lib/types';

// Customer accounts are not needed for a boutique this size: orders are looked
// up by number + phone, and the wishlist / recent orders live on this device.
export function AccountView() {
  const { wishlist, ready, config } = useStore();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const [orders, setOrders] = useState<{ number: string; key: string; at: string }[]>([]);

  useEffect(() => {
    try {
      setOrders(JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]'));
    } catch {
      setOrders([]);
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!wishlist.length) return setItems([]);
    api<CardProduct[]>(`/api/products/by-ids?ids=${wishlist.join(',')}`).then(setItems).catch(() => setItems([]));
  }, [wishlist, ready]);

  return (
    <div className="container-x py-10 md:py-14">
      <p className="eyebrow">Welcome</p>
      <h1 className="mt-2 text-[40px] md:text-[52px]">My Account</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { href: '/track', Icon: PackageSearch, t: 'Track an order', s: 'Order number + mobile' },
          { href: '/customized-stitching', Icon: Scissors, t: 'Custom stitching', s: 'Send measurements & designs' },
          { href: waLink(config.whatsappNumber, `Hi ${config.businessName}`), Icon: WhatsAppIcon, t: 'Help on WhatsApp', s: 'We reply quickly', ext: true },
        ].map(({ href, Icon, t, s, ext }) => (
          <a key={t} href={href} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined} className="flex items-center gap-4 border border-line bg-white p-5 transition-colors hover:border-charcoal">
            <Icon size={22} className="text-wine" />
            <span>
              <span className="block font-medium">{t}</span>
              <span className="text-[13px] text-muted">{s}</span>
            </span>
          </a>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-3xl"><Package size={22} className="text-wine" /> Recent Orders</h2>
        {orders.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.number} className="flex items-center justify-between py-3 text-[14px]">
                <span>
                  <span className="font-medium">{o.number}</span> <span className="text-muted">· {formatDate(o.at)}</span>
                </span>
                <Link href={`/order/${o.number}?key=${o.key}`} className="text-[12px] uppercase tracking-[0.14em] text-wine underline-offset-4 hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">Orders placed on this device appear here. You can always <Link href="/track" className="text-wine underline">track an order</Link> with its number.</p>
        )}
      </section>

      <section id="wishlist" className="mt-14 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-3xl"><Heart size={22} className="text-wine" /> Wishlist</h2>
        {items === null ? (
          <p className="mt-3 text-muted">Loading…</p>
        ) : items.length ? (
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted">
            Tap the heart on any product to save it here. <Link href="/shop" className="text-wine underline">Start browsing</Link>
          </p>
        )}
      </section>
    </div>
  );
}
