'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/store/store-provider';
import { QuickView } from '@/components/store/quick-view';
import { formatINR } from '@/lib/format';
import { productPath } from '@/lib/slug';
import type { CardProduct, CardVariant } from '@/lib/types';

export function cartItemFrom(p: CardProduct, v: CardVariant, quantity = 1) {
  return {
    variantId: v.id,
    productId: p.id,
    name: p.name,
    slug: p.slug,
    categorySlug: p.categorySlug,
    image: p.image,
    sku: v.sku,
    size: v.size,
    color: v.color,
    price: v.price,
    mrp: v.mrp,
    quantity,
    available: v.available,
  };
}

export function WishlistButton({ productId, className = '' }: { productId: string; className?: string }) {
  const { wishlist, toggleWishlist, toast, ready } = useStore();
  const [pop, setPop] = useState(0);
  const on = ready && wishlist.includes(productId);
  return (
    <button
      type="button"
      aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        const added = toggleWishlist(productId);
        setPop((x) => x + 1);
        toast({ message: added ? 'Saved to your wishlist' : 'Removed from wishlist', tone: 'info', action: added ? { label: 'View', href: '/account#wishlist' } : undefined });
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur transition-colors hover:bg-white ${className}`}
    >
      <Heart key={pop} size={17} strokeWidth={1.6} className={`${pop ? 'animate-pop' : ''} ${on ? 'fill-wine text-wine' : 'text-charcoal'}`} />
    </button>
  );
}

export function ProductCard({ product: p, priority = false, showActions = true }: { product: CardProduct; priority?: boolean; showActions?: boolean }) {
  const { addToCart, toast, cart } = useStore();
  const router = useRouter();
  const [quick, setQuick] = useState(false);
  const href = productPath(p.categorySlug, p.slug);
  const single = p.variants.filter((v) => v.available > 0).length === 1 && p.variants.length === 1 ? p.variants[0] : null;

  const add = (buyNow: boolean) => {
    if (!single) {
      setQuick(true);
      return;
    }
    const inCart = cart.find((c) => c.variantId === single.id)?.quantity ?? 0;
    if (buyNow && inCart > 0) return router.push('/checkout');
    if (addToCart(cartItemFrom(p, single))) {
      if (buyNow) router.push('/checkout');
      else toast({ message: `${p.name} added to cart`, tone: 'success', image: p.image, action: { label: 'View Cart', href: '/cart' } });
    } else toast({ message: `Only ${single.available} available`, tone: 'error' });
  };

  return (
    <article className="group relative flex h-full animate-fade-up flex-col">
      <div className="relative overflow-hidden bg-sand">
        <Link href={href} className="block aspect-[4/5]" aria-label={p.name}>
          {p.image ? (
            <>
              <Image
                src={p.image}
                alt={p.imageAlt}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className={`object-cover transition-all duration-700 group-hover:scale-[1.04] ${p.image2 ? 'group-hover:opacity-0' : ''} ${p.inStock ? '' : 'opacity-70 grayscale-[35%]'}`}
              />
              {p.image2 && (
                <Image src={p.image2} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="scale-[1.04] object-cover opacity-0 transition-all duration-700 group-hover:scale-100 group-hover:opacity-100" />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-2xl text-beige">NABA</div>
          )}
        </Link>
        <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {!p.inStock ? (
            <span className="bg-charcoal px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ivory">Out of Stock</span>
          ) : (
            <>
              {p.discount > 0 && <span className="bg-wine px-2 py-1 text-[10px] font-medium tracking-[0.1em] text-ivory">{p.discount}% OFF</span>}
              {p.isNew && <span className="bg-ivory px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal">New</span>}
            </>
          )}
        </div>
        <WishlistButton productId={p.id} className="absolute top-2.5 right-2.5" />
        {showActions && p.inStock && (
          <div className="absolute inset-x-2.5 bottom-2.5 hidden translate-y-3 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
            <button type="button" onClick={() => add(false)} className="btn flex-1 bg-white/95 px-3 py-2.5 text-charcoal backdrop-blur hover:bg-charcoal hover:text-ivory">
              <ShoppingBag size={14} /> Add to Cart
            </button>
            <button type="button" onClick={() => setQuick(true)} aria-label="Quick view" className="btn bg-white/95 px-3 py-2.5 text-charcoal backdrop-blur hover:bg-charcoal hover:text-ivory">
              <Eye size={15} />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-3">
        <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted">{p.categoryName}</p>
        <h3 className="mt-1 font-serif text-[18px] leading-snug text-charcoal md:text-[19px]">
          <Link href={href} className="hover:text-wine">
            {p.name}
          </Link>
        </h3>
        {p.shortDesc && <p className="mt-1 line-clamp-1 hidden text-[13px] text-muted sm:block">{p.shortDesc}</p>}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-[15px] font-medium text-charcoal">{formatINR(p.price)}</span>
          {p.discount > 0 && (
            <>
              <span className="text-[13px] text-muted line-through">{formatINR(p.mrp)}</span>
              <span className="text-[12px] text-wine">{p.discount}% off</span>
            </>
          )}
        </div>
        {p.sizes.length > 0 && <p className="mt-1 text-[11.5px] tracking-wide text-muted">{p.sizes.join(' · ')}</p>}
        {showActions && (
          <div className="mt-3 grid grid-cols-2 gap-1.5 md:hidden">
            <button type="button" disabled={!p.inStock} onClick={() => add(false)} className="btn border border-charcoal px-2 py-2.5 text-[10.5px] tracking-[0.1em]">
              Add to Cart
            </button>
            <button type="button" disabled={!p.inStock} onClick={() => add(true)} className="btn bg-charcoal px-2 py-2.5 text-[10.5px] tracking-[0.1em] text-ivory">
              Buy Now
            </button>
          </div>
        )}
        {showActions && (
          <button type="button" disabled={!p.inStock} onClick={() => add(true)} className="mt-2 hidden self-start text-[11px] font-medium uppercase tracking-[0.18em] text-wine underline-offset-4 hover:underline disabled:hidden md:block">
            Buy Now
          </button>
        )}
      </div>
      {quick && <QuickView product={p} onClose={() => setQuick(false)} />}
    </article>
  );
}
