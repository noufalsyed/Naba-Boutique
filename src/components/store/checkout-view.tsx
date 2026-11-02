'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { OrderSummary } from '@/components/store/order-summary';
import { useFreshCart } from '@/components/store/cart-view';
import { WhatsAppIcon } from '@/components/store/icons';
import { payForOrder } from '@/components/store/pay';
import { api, ApiError } from '@/lib/api-client';
import { formatINR } from '@/lib/format';
import { computeTotals } from '@/lib/pricing';
import { INDIAN_STATES } from '@/lib/constants';

const DETAILS_KEY = 'fts.checkout.v1';
export const ORDERS_KEY = 'fts.orders.v1';

type Form = { name: string; phone: string; whatsapp: string; email: string; address: string; city: string; state: string; pincode: string; deliveryNotes: string };
const EMPTY: Form = { name: '', phone: '', whatsapp: '', email: '', address: '', city: '', state: 'Kerala', pincode: '', deliveryNotes: '' };

export function rememberOrder(number: string, key: string) {
  try {
    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]') as { number: string; key: string; at: string }[];
    localStorage.setItem(ORDERS_KEY, JSON.stringify([{ number, key, at: new Date().toISOString() }, ...all.filter((o) => o.number !== number)].slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

function Field({ label, name, values, set, errors, type = 'text', required = true, ...rest }: { label: string; name: keyof Form; values: Form; set: (k: keyof Form, v: string) => void; errors: Record<string, string>; type?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {!required && <span className="normal-case tracking-normal text-muted/70">(optional)</span>}
      </label>
      <input id={name} name={name} type={type} required={required} value={values[name]} onChange={(e) => set(name, e.target.value)} aria-invalid={!!errors[name]} className={`input ${errors[name] ? 'border-danger' : ''}`} {...rest} />
      {errors[name] && <p className="mt-1 text-[12.5px] text-danger">{errors[name]}</p>}
    </div>
  );
}

export function CheckoutView() {
  const { cart, ready, config, clearCart, toast } = useStore();
  useFreshCart();
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [sameWa, setSameWa] = useState(true);
  const [method, setMethod] = useState<'ONLINE' | 'WHATSAPP'>('ONLINE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const totals = computeTotals(cart, config.shipping);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? 'null') as Partial<Form> | null;
      if (saved) setForm((f) => ({ ...f, ...saved, deliveryNotes: '' }));
    } catch {
      /* ignore */
    }
  }, []);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      const payload = { ...form, whatsapp: sameWa ? form.phone : form.whatsapp, method, lines: cart.map((c) => ({ variantId: c.variantId, quantity: c.quantity })) };
      const order = await api<{ number: string; key: string }>('/api/checkout', payload);
      try {
        const { deliveryNotes: _n, ...keep } = form;
        localStorage.setItem(DETAILS_KEY, JSON.stringify(keep));
      } catch {
        /* ignore */
      }
      rememberOrder(order.number, order.key);
      clearCart();
      if (method === 'ONLINE') await payForOrder(order.number, order.key);
      else router.push(`/order/${order.number}?key=${order.key}&via=whatsapp`);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.details && typeof err.details === 'object' && !('problems' in err.details)) setErrors(err.details as Record<string, string>);
      toast({ message: err instanceof Error ? err.message : 'Could not place the order', tone: 'error' });
      if (err instanceof ApiError && err.status === 409) router.push('/cart');
    }
  };

  if (!ready) return <div className="container-x min-h-[50vh] py-12" />;
  if (!cart.length && !busy)
    return (
      <div className="container-x py-20 text-center">
        <h1 className="text-[36px]">Your cart is empty</h1>
        <Link href="/shop" className="btn-primary mt-6">Shop now</Link>
      </div>
    );

  return (
    <div className="container-x py-8 md:py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-[36px] md:text-[46px]">Checkout</h1>
        <span className="flex items-center gap-1.5 text-[12px] text-muted"><Lock size={13} /> Secure checkout</span>
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-5 lg:gap-12" noValidate={false}>
        <div className="space-y-10 lg:col-span-3">
          <section>
            <h2 className="mb-4 text-2xl">1. Your Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Full Name" name="name" values={form} set={set} errors={errors} autoComplete="name" maxLength={100} /></div>
              <Field label="Mobile Number" name="phone" values={form} set={set} errors={errors} type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[0-9+ ]{10,14}" placeholder="10-digit mobile" />
              <Field label="Email" name="email" values={form} set={set} errors={errors} type="email" required={false} autoComplete="email" />
              <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
                <input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} className="accent-wine" /> My WhatsApp number is the same as my mobile number
              </label>
              {!sameWa && <Field label="WhatsApp Number" name="whatsapp" values={form} set={set} errors={errors} type="tel" inputMode="numeric" />}
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-2xl">2. Delivery Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="label">Address</label>
                <textarea id="address" required rows={3} maxLength={400} value={form.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" placeholder="House name / number, street, landmark" className={`input ${errors.address ? 'border-danger' : ''}`} />
                {errors.address && <p className="mt-1 text-[12.5px] text-danger">{errors.address}</p>}
              </div>
              <Field label="City" name="city" values={form} set={set} errors={errors} autoComplete="address-level2" maxLength={80} />
              <div>
                <label htmlFor="state" className="label">State</label>
                <select id="state" value={form.state} onChange={(e) => set('state', e.target.value)} className="input" autoComplete="address-level1">
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="PIN Code" name="pincode" values={form} set={set} errors={errors} inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" maxLength={6} />
              <div className="sm:col-span-2">
                <label htmlFor="deliveryNotes" className="label">Delivery Instructions <span className="normal-case tracking-normal text-muted/70">(optional)</span></label>
                <input id="deliveryNotes" value={form.deliveryNotes} onChange={(e) => set('deliveryNotes', e.target.value)} maxLength={400} className="input" placeholder="E.g. call before delivery" />
              </div>
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-2xl">3. Payment Method</h2>
            <div className="space-y-3" role="radiogroup">
              <label className={`flex cursor-pointer gap-4 border bg-white p-4 transition-colors ${method === 'ONLINE' ? 'border-charcoal' : 'border-line hover:border-beige'}`}>
                <input type="radio" name="method" checked={method === 'ONLINE'} onChange={() => setMethod('ONLINE')} className="mt-1 accent-wine" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium"><CreditCard size={17} className="text-wine" /> Online Payment</span>
                  <span className="mt-1 block text-[13px] text-muted">UPI (GPay, PhonePe, Paytm), credit & debit cards, net banking and wallets — through our secure payment gateway. We never see or store your card details.</span>
                </span>
              </label>
              <label className={`flex cursor-pointer gap-4 border bg-white p-4 transition-colors ${method === 'WHATSAPP' ? 'border-charcoal' : 'border-line hover:border-beige'}`}>
                <input type="radio" name="method" checked={method === 'WHATSAPP'} onChange={() => setMethod('WHATSAPP')} className="mt-1 accent-wine" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium"><WhatsAppIcon size={17} className="text-[#1f8f4e]" /> Order via WhatsApp</span>
                  <span className="mt-1 block text-[13px] text-muted">We create your order and open WhatsApp with the full summary. Our team confirms availability and shares payment details.</span>
                </span>
              </label>
            </div>
          </section>
        </div>
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-28">
            <ul className="mb-4 space-y-3">
              {cart.map((c) => (
                <li key={c.variantId} className="flex items-center gap-3 text-[14px]">
                  <span className="relative aspect-[4/5] w-14 shrink-0 bg-sand">
                    {c.image && <Image src={c.image} alt="" fill sizes="56px" className="object-cover" />}
                    <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal px-1 text-[10px] text-ivory">{c.quantity}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.name}</span>
                    <span className="text-[12px] text-muted">{c.size}{c.color ? ` · ${c.color}` : ''}</span>
                  </span>
                  <span>{formatINR(c.price * c.quantity)}</span>
                </li>
              ))}
            </ul>
            <OrderSummary totals={totals} freeAbove={config.shipping.freeAbove}>
              <button type="submit" disabled={busy || !cart.length} className={`mt-6 w-full py-4 ${method === 'ONLINE' ? 'btn-primary' : 'btn-whatsapp'}`}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : method === 'ONLINE' ? <Lock size={15} /> : <WhatsAppIcon size={18} />}
                {method === 'ONLINE' ? `Pay ${formatINR(totals.total)}` : 'Place Order via WhatsApp'}
              </button>
              <p className="mt-3 text-center text-[11.5px] text-muted">
                By placing this order you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/shipping-returns" className="underline">Shipping & Returns</Link> policy.
              </p>
            </OrderSummary>
          </div>
        </div>
      </form>
    </div>
  );
}
