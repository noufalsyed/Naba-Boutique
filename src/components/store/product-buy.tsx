'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Link2, ShieldCheck, Truck, X } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { VariantPicker, useVariantPicker } from '@/components/store/variant-picker';
import { WishlistButton, cartItemFrom } from '@/components/store/product-card';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from '@/components/store/icons';
import { formatINR } from '@/lib/format';
import { discountPercent } from '@/lib/pricing';
import { productEnquiryMessage, productOrderMessage, waLink } from '@/lib/whatsapp';
import type { CardProduct } from '@/lib/types';

const SIZE_CHART = [
  ['XS', '32', '26', '35', '44'],
  ['S', '34', '28', '37', '44'],
  ['M', '36', '30', '39', '45'],
  ['L', '38', '32', '41', '45'],
  ['XL', '40', '34', '43', '46'],
  ['XXL', '42', '36', '45', '46'],
  ['3XL', '44', '38', '47', '46'],
];

export function SizeChart({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Size chart">
      <button type="button" aria-label="Close" className="absolute inset-0 animate-fade-in bg-charcoal/45" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up bg-ivory p-6 md:animate-fade-up">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">Size Chart</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-muted">Garment measurements in inches. Unsure? Choose custom stitching and we will make it to your size.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-center text-[14px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-muted">
                {['Size', 'Bust', 'Waist', 'Hip', 'Length'].map((h) => (
                  <th key={h} className="py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((r) => (
                <tr key={r[0]} className="border-b border-line/60">
                  {r.map((c, i) => (
                    <td key={i} className={`py-2 ${i === 0 ? 'font-medium' : ''}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ProductBuy({ product: p, url }: { product: CardProduct; url: string }) {
  const picker = useVariantPicker(p.variants);
  const { addToCart, toast, config, cart } = useStore();
  const router = useRouter();
  const [chart, setChart] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const buttons = useRef<HTMLDivElement>(null);
  const v = picker.selected;
  const price = v?.price ?? p.price;
  const mrp = v?.mrp ?? p.mrp;
  const off = discountPercent(price, mrp);
  const soldOut = !p.inStock;

  useEffect(() => {
    const el = buttons.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const add = (buyNow: boolean) => {
    if (!v) {
      toast({ message: 'Please select a size', tone: 'error' });
      buttons.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const inCart = cart.find((c) => c.variantId === v.id)?.quantity ?? 0;
    if (buyNow && inCart >= picker.quantity) return router.push('/checkout');
    if (!addToCart(cartItemFrom(p, v, picker.quantity))) return toast({ message: `Only ${v.available} available${inCart ? ` (${inCart} already in your cart)` : ''}`, tone: 'error' });
    if (buyNow) router.push('/checkout');
    else toast({ message: `${p.name} (${v.size}) added to cart`, tone: 'success', image: p.image, action: { label: 'View Cart', href: '/cart' } });
  };

  const waHref = v
    ? waLink(config.whatsappNumber, productOrderMessage(config.businessName, { name: p.name, sku: v.sku, size: v.size, color: v.color, quantity: picker.quantity, price: v.price }, url))
    : waLink(config.whatsappNumber, productEnquiryMessage(config.businessName, { name: p.name, sku: p.variants[0]?.sku ?? '', price: p.price }));

  const share = async (kind: 'copy' | 'instagram') => {
    try {
      if (kind === 'instagram' && navigator.share) {
        await navigator.share({ title: p.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ message: kind === 'instagram' ? 'Link copied — paste it in your Instagram story or DM' : 'Link copied', tone: 'success' });
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-[24px] font-medium">{formatINR(price)}</span>
        {off > 0 && (
          <>
            <span className="text-[16px] text-muted line-through">MRP {formatINR(mrp)}</span>
            <span className="bg-blush px-2 py-0.5 text-[12px] font-medium text-wine">{off}% OFF</span>
          </>
        )}
      </div>
      <p className="mt-1 text-[12px] text-muted">Inclusive of all taxes{v ? ` · SKU ${v.sku}` : ''}</p>

      <div className="mt-7">
        {soldOut ? (
          <p className="border border-line bg-white p-4 text-[14px]">
            <span className="font-medium text-danger">Out of Stock.</span> Message us on WhatsApp and we will tell you when it is back.
          </p>
        ) : (
          <VariantPicker picker={picker} onSizeChart={() => setChart(true)} />
        )}
      </div>

      <div ref={buttons} className="mt-7 space-y-2.5">
        {!soldOut && (
          <div className="flex gap-2.5">
            <button type="button" onClick={() => add(false)} className="btn-outline flex-1 py-4">
              Add to Cart
            </button>
            <button type="button" onClick={() => add(true)} className="btn-primary flex-1 py-4">
              Buy Now
            </button>
            <WishlistButton productId={p.id} className="h-auto w-14 rounded-none border border-line" />
          </div>
        )}
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full py-4">
          <WhatsAppIcon size={18} /> {soldOut ? 'Ask on WhatsApp' : 'Order on WhatsApp'}
        </a>
        {!v && !soldOut && <p className="text-center text-[12px] text-muted">Select size and colour to include them in your WhatsApp order</p>}
      </div>

      <ul className="mt-7 space-y-2.5 border-y border-line py-5 text-[13.5px] text-ink/85">
        <li className="flex gap-2.5"><Truck size={17} className="shrink-0 text-wine" /> {config.shipping.freeAbove ? `Free shipping above ${formatINR(config.shipping.freeAbove)}. ` : ''}Delivery in {config.estimatedDelivery}.</li>
        <li className="flex gap-2.5"><ShieldCheck size={17} className="shrink-0 text-wine" /> Secure payment by UPI, cards, net banking or wallets.</li>
      </ul>

      <div className="mt-5 flex items-center gap-2">
        <span className="mr-1 text-[12px] uppercase tracking-[0.14em] text-muted">Share</span>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name} — ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-charcoal">
          <WhatsAppIcon size={16} />
        </a>
        <button type="button" onClick={() => share('instagram')} aria-label="Share to Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-charcoal">
          <InstagramIcon size={16} />
        </button>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-charcoal">
          <FacebookIcon size={16} />
        </a>
        <button type="button" onClick={() => share('copy')} aria-label="Copy link" className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-charcoal">
          {copied ? <Check size={16} className="text-success" /> : <Link2 size={16} />}
        </button>
      </div>

      {/* Sticky bar on mobile once the main buttons scroll away */}
      {!soldOut && (
        <div className={`fixed inset-x-0 bottom-[3.65rem] z-30 border-t border-line bg-ivory/95 px-4 py-2.5 backdrop-blur transition-transform duration-300 md:hidden ${showSticky ? 'translate-y-0' : 'pointer-events-none translate-y-[200%]'}`}>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px]">{p.name}</p>
              <p className="text-[14px] font-medium">{formatINR(price)}{v ? ` · ${v.size}` : ''}</p>
            </div>
            <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="Order on WhatsApp" className="btn-whatsapp px-3.5 py-3">
              <WhatsAppIcon size={17} />
            </a>
            <button type="button" onClick={() => add(false)} className="btn-primary px-4 py-3">
              {v ? 'Add to Cart' : 'Select Size'}
            </button>
          </div>
        </div>
      )}
      {chart && <SizeChart onClose={() => setChart(false)} />}
    </div>
  );
}
