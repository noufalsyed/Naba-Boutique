'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { OrderSummary } from '@/components/store/order-summary';
import { WhatsAppIcon } from '@/components/store/icons';
import { api } from '@/lib/api-client';
import { formatINR } from '@/lib/format';
import { computeTotals } from '@/lib/pricing';
import { productPath } from '@/lib/slug';
import { cartOrderMessage, waLink } from '@/lib/whatsapp';

interface Fresh {
  items: { variantId: string; price: number; mrp: number; available: number }[];
  problems: { variantId: string; message: string; available: number }[];
}

/** Re-checks prices and stock with the server and updates the stored cart. */
export function useFreshCart() {
  const { cart, replaceCart, ready } = useStore();
  const [problems, setProblems] = useState<Fresh['problems']>([]);
  const checked = useRef('');
  useEffect(() => {
    if (!ready || !cart.length) return;
    const sig = cart.map((c) => `${c.variantId}:${c.quantity}`).join(',');
    if (checked.current === sig) return;
    checked.current = sig;
    api<Fresh>('/api/cart/validate', { lines: cart.map((c) => ({ variantId: c.variantId, quantity: c.quantity })) })
      .then((r) => {
        setProblems(r.problems);
        const byId = new Map(r.items.map((i) => [i.variantId, i]));
        let changed = false;
        const next = cart.map((c) => {
          const f = byId.get(c.variantId);
          if (!f) return { ...c, available: 0 };
          if (f.price !== c.price || f.mrp !== c.mrp || f.available !== c.available) changed = true;
          return { ...c, price: f.price, mrp: f.mrp, available: f.available };
        });
        if (changed || r.items.length !== cart.length) replaceCart(next);
      })
      .catch(() => {});
  }, [cart, ready, replaceCart]);
  return problems;
}

export function CartView() {
  const { cart, ready, setQuantity, removeFromCart, toggleWishlist, wishlist, toast, config } = useStore();
  const problems = useFreshCart();
  const totals = computeTotals(cart, config.shipping);
  const blocked = cart.some((c) => c.available < c.quantity);

  const waText = cartOrderMessage(config.businessName, {
    lines: cart.map((c) => ({ name: c.name, sku: c.sku, size: c.size, color: c.color, quantity: c.quantity, price: c.price })),
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
  });

  if (!ready) return <div className="container-x min-h-[50vh] py-12" />;

  if (!cart.length)
    return (
      <div className="container-x flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
        <ShoppingBag size={44} strokeWidth={1} className="text-beige" />
        <h1 className="mt-4 text-[38px]">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-muted">Explore our latest chudidhars, dress materials and ethnic wear.</p>
        <Link href="/shop" className="btn-primary mt-8 px-10 py-4">
          Continue Shopping
        </Link>
      </div>
    );

  return (
    <div className="container-x py-8 md:py-12">
      <h1 className="text-[38px] md:text-[48px]">Shopping Cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:gap-12">
        <ul className="divide-y divide-line border-y border-line lg:col-span-2">
          {cart.map((c) => {
            const issue = problems.find((p) => p.variantId === c.variantId);
            const out = c.available <= 0;
            const saved = wishlist.includes(c.productId);
            return (
              <li key={c.variantId} className="flex animate-fade-in gap-4 py-5">
                <Link href={productPath(c.categorySlug, c.slug)} className="relative aspect-[4/5] w-24 shrink-0 bg-sand md:w-28">
                  {c.image && <Image src={c.image} alt={c.name} fill sizes="112px" className={`object-cover ${out ? 'opacity-50' : ''}`} />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={productPath(c.categorySlug, c.slug)} className="font-serif text-[19px] leading-tight hover:text-wine">
                        {c.name}
                      </Link>
                      <p className="mt-1 text-[13px] text-muted">
                        Size: {c.size}
                        {c.color && ` · Colour: ${c.color}`}
                      </p>
                      <p className="text-[12px] text-muted">SKU {c.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatINR(c.price * c.quantity)}</p>
                      {c.mrp > c.price && <p className="text-[12px] text-muted line-through">{formatINR(c.mrp * c.quantity)}</p>}
                      {c.quantity > 1 && <p className="text-[12px] text-muted">{formatINR(c.price)} each</p>}
                    </div>
                  </div>
                  {(issue || out) && <p className="mt-2 text-[13px] text-danger">{out ? 'Out of stock — please remove this item' : issue?.message}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center border border-line bg-white">
                      <button type="button" aria-label="Decrease quantity" disabled={c.quantity <= 1} onClick={() => setQuantity(c.variantId, c.quantity - 1)} className="p-2.5 disabled:opacity-40">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-[14px]">{c.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={c.quantity >= c.available} onClick={() => setQuantity(c.variantId, c.quantity + 1)} className="p-2.5 disabled:opacity-40">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!saved) toggleWishlist(c.productId);
                          removeFromCart(c.variantId);
                          toast({ message: 'Moved to wishlist', tone: 'info' });
                        }}
                        className="flex items-center gap-1.5 p-2 text-[12px] text-muted hover:text-wine"
                      >
                        <Heart size={15} className={saved ? 'fill-wine text-wine' : ''} /> <span className="hidden sm:inline">Wishlist</span>
                      </button>
                      <button type="button" onClick={() => removeFromCart(c.variantId)} className="flex items-center gap-1.5 p-2 text-[12px] text-muted hover:text-danger" aria-label={`Remove ${c.name}`}>
                        <Trash2 size={15} /> <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <OrderSummary totals={totals} freeAbove={config.shipping.freeAbove}>
            <div className="mt-6 space-y-2.5">
              {blocked ? (
                <button type="button" disabled className="btn-primary w-full py-4">
                  Proceed to Checkout
                </button>
              ) : (
                <Link href="/checkout" className="btn-primary w-full py-4">
                  Proceed to Checkout
                </Link>
              )}
              <a href={waLink(config.whatsappNumber, waText)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full py-4">
                <WhatsAppIcon size={18} /> Order via WhatsApp
              </a>
              <Link href="/shop" className="block pt-2 text-center text-[12px] uppercase tracking-[0.16em] text-muted hover:text-wine">
                Continue shopping
              </Link>
            </div>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
