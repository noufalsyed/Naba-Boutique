'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { VariantPicker, useVariantPicker } from '@/components/store/variant-picker';
import { cartItemFrom } from '@/components/store/product-card';
import { formatINR } from '@/lib/format';
import { discountPercent } from '@/lib/pricing';
import { productPath } from '@/lib/slug';
import type { CardProduct } from '@/lib/types';

export function QuickView({ product: p, onClose }: { product: CardProduct; onClose: () => void }) {
  const picker = useVariantPicker(p.variants);
  const { addToCart, toast } = useStore();
  const router = useRouter();
  const v = picker.selected;
  const price = v?.price ?? p.price;
  const mrp = v?.mrp ?? p.mrp;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const add = (buyNow: boolean) => {
    if (!v) return toast({ message: 'Please select a size', tone: 'error' });
    if (!addToCart(cartItemFrom(p, v, picker.quantity))) return toast({ message: `Only ${v.available} available`, tone: 'error' });
    onClose();
    if (buyNow) router.push('/checkout');
    else toast({ message: `${p.name} (${v.size}) added to cart`, tone: 'success', image: p.image, action: { label: 'View Cart', href: '/cart' } });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={`Quick view: ${p.name}`}>
      <button type="button" aria-label="Close" className="absolute inset-0 animate-fade-in bg-charcoal/45" onClick={onClose} />
      <div className="relative grid max-h-[92vh] w-full max-w-3xl animate-slide-up overflow-y-auto bg-ivory md:animate-fade-up md:grid-cols-2">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
          <X size={18} />
        </button>
        <div className="relative hidden aspect-[4/5] bg-sand md:block">{p.image && <Image src={p.image} alt={p.imageAlt} fill sizes="400px" className="object-cover" />}</div>
        <div className="p-5 md:p-7">
          <div className="flex gap-4 md:block">
            {p.image && (
              <div className="relative aspect-[4/5] w-24 shrink-0 bg-sand md:hidden">
                <Image src={p.image} alt="" fill sizes="96px" className="object-cover" />
              </div>
            )}
            <div>
              <p className="eyebrow">{p.categoryName}</p>
              <h2 className="mt-1 text-[26px] leading-tight">{p.name}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-medium">{formatINR(price)}</span>
                {mrp > price && (
                  <>
                    <span className="text-sm text-muted line-through">{formatINR(mrp)}</span>
                    <span className="text-sm text-wine">{discountPercent(price, mrp)}% off</span>
                  </>
                )}
              </div>
              {v && <p className="mt-1 text-[12px] text-muted">SKU {v.sku}</p>}
            </div>
          </div>
          <div className="mt-5">
            <VariantPicker picker={picker} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => add(false)} className="btn-outline px-3">
              Add to Cart
            </button>
            <button type="button" onClick={() => add(true)} className="btn-primary px-3">
              Buy Now
            </button>
          </div>
          <Link href={productPath(p.categorySlug, p.slug)} className="mt-4 inline-block text-[12px] uppercase tracking-[0.16em] text-muted underline-offset-4 hover:text-wine hover:underline">
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}
