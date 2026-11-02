'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import type { CartItem } from '@/lib/types';

export interface SiteConfig {
  appUrl: string;
  whatsappNumber: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  shipping: { flat: number; freeAbove: number };
  estimatedDelivery: string;
}

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  image?: string | null;
  action?: { label: string; href: string };
}

interface StoreState {
  config: SiteConfig;
  cart: CartItem[];
  cartCount: number;
  cartBump: number;
  ready: boolean;
  addToCart: (item: CartItem) => boolean;
  setQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  replaceCart: (items: CartItem[]) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => boolean;
  toast: (t: Omit<Toast, 'id'>) => void;
}

const Ctx = createContext<StoreState | null>(null);
const CART_KEY = 'fts.cart.v1';
const WISH_KEY = 'fts.wishlist.v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ config, children }: { config: SiteConfig; children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartBump, setCartBump] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    setCart(load<CartItem[]>(CART_KEY, []).filter((i) => i && i.variantId && i.quantity > 0));
    setWishlist(load<string[]>(WISH_KEY, []));
    setReady(true);
    const sync = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCart(load(CART_KEY, []));
      if (e.key === WISH_KEY) setWishlist(load(WISH_KEY, []));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), t.action ? 4500 : 3000);
  }, []);

  const addToCart = useCallback(
    (item: CartItem) => {
      let ok = true;
      setCart((all) => {
        const existing = all.find((i) => i.variantId === item.variantId);
        const want = (existing?.quantity ?? 0) + item.quantity;
        if (want > item.available) {
          ok = false;
          return all;
        }
        if (existing) return all.map((i) => (i.variantId === item.variantId ? { ...item, quantity: want } : i));
        return [...all, item];
      });
      if (ok) setCartBump((b) => b + 1);
      return ok;
    },
    [],
  );

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setCart((all) => all.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.available || 1)) } : i)));
  }, []);
  const removeFromCart = useCallback((variantId: string) => setCart((all) => all.filter((i) => i.variantId !== variantId)), []);
  const replaceCart = useCallback((items: CartItem[]) => setCart(items), []);
  const clearCart = useCallback(() => setCart([]), []);
  const toggleWishlist = useCallback((productId: string) => {
    let added = false;
    setWishlist((all) => {
      added = !all.includes(productId);
      return added ? [...all, productId] : all.filter((x) => x !== productId);
    });
    return added;
  }, []);

  const value = useMemo<StoreState>(
    () => ({
      config,
      cart,
      cartCount: cart.reduce((s, i) => s + i.quantity, 0),
      cartBump,
      ready,
      addToCart,
      setQuantity,
      removeFromCart,
      replaceCart,
      clearCart,
      wishlist,
      toggleWishlist,
      toast,
    }),
    [config, cart, cartBump, ready, addToCart, setQuantity, removeFromCart, replaceCart, clearCart, wishlist, toggleWishlist, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 border border-line bg-white p-3 shadow-[0_12px_40px_-12px_rgba(42,38,36,0.35)]"
            role="status"
          >
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" className="h-14 w-11 shrink-0 object-cover" />
            ) : (
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                {t.tone === 'error' ? <X size={16} /> : <Check size={16} />}
              </span>
            )}
            <p className="flex-1 text-[14px] leading-snug text-charcoal">{t.message}</p>
            {t.action && (
              <Link href={t.action.href} className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-wine underline-offset-4 hover:underline">
                {t.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
