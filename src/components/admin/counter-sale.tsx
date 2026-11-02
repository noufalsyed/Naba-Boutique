'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { Card, Field, useToast } from '@/components/admin/ui';
import { VariantSearch, type VariantHit } from '@/components/admin/variant-search';
import { api } from '@/lib/api-client';
import { formatINR, round2 } from '@/lib/format';

type Line = VariantHit & { quantity: number };

export function CounterSale() {
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [tendered, setTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; number: string; total: number } | null>(null);
  const toast = useToast();

  const add = (v: VariantHit) => {
    if (v.available <= 0) return toast(`${v.name} (${v.size}) is out of stock`, 'error');
    setLines((ls) => {
      const ex = ls.find((l) => l.id === v.id);
      if (ex) return ls.map((l) => (l.id === v.id ? { ...l, quantity: Math.min(l.quantity + 1, l.available) } : l));
      return [...ls, { ...v, quantity: 1 }];
    });
  };
  const setQty = (id: string, q: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, Math.min(q, l.available)) } : l)));

  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = round2(subtotal - disc);
  const change = method === 'CASH' && Number(tendered) > total ? round2(Number(tendered) - total) : 0;

  const complete = async () => {
    if (!lines.length) return;
    setBusy(true);
    try {
      const r = await api<{ id: string; number: string }>('/api/admin/sales', {
        customerName: customerName || undefined,
        phone: phone || undefined,
        paymentMethod: method,
        extraDiscount: disc,
        lines: lines.map((l) => ({ variantId: l.id, quantity: l.quantity })),
      });
      setDone({ ...r, total });
      setLines([]);
      setDiscount('0');
      setCustomerName('');
      setPhone('');
      setTendered('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sale failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {done && (
          <div className="flex flex-wrap items-center gap-3 border border-success/30 bg-success/5 p-4 text-[14px]">
            <CheckCircle2 size={20} className="text-success" />
            <span>Sale <strong>{done.number}</strong> completed — {formatINR(done.total)}. Stock updated.</span>
            <Link href={`/admin/sales/${done.id}`} className="ml-auto text-wine underline">View / print invoice</Link>
          </div>
        )}
        <VariantSearch autoFocus onPick={add} placeholder="Search product or SKU, then press Enter…" />
        <Card>
          {lines.length ? (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-3">
                  <span className="relative h-14 w-11 shrink-0 bg-sand">{l.image && <Image src={l.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                  <span className="min-w-0 flex-1 text-[14px]">
                    <span className="block truncate font-medium">{l.name}</span>
                    <span className="text-[12px] text-muted">{l.sku} · {l.size}{l.color ? ` · ${l.color}` : ''} · {l.available} available</span>
                  </span>
                  <span className="inline-flex items-center border border-line">
                    <button type="button" aria-label="Decrease" onClick={() => setQty(l.id, l.quantity - 1)} className="p-2"><Minus size={13} /></button>
                    <span className="w-8 text-center text-[14px]">{l.quantity}</span>
                    <button type="button" aria-label="Increase" onClick={() => setQty(l.id, l.quantity + 1)} disabled={l.quantity >= l.available} className="p-2 disabled:opacity-30"><Plus size={13} /></button>
                  </span>
                  <span className="w-24 text-right font-medium">{formatINR(l.price * l.quantity)}</span>
                  <button type="button" aria-label="Remove" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="p-1.5 text-muted hover:text-danger"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-12 text-center text-muted">Search for products to add them to this sale.</p>
          )}
        </Card>
      </div>

      <Card title="Payment" className="h-fit lg:sticky lg:top-6">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer name"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" className="input" /></Field>
            <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="Optional" className="input" /></Field>
          </div>
          <div>
            <span className="label">Payment method</span>
            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={`chip py-3 ${method === m ? 'chip-active' : ''}`}>{m === 'CASH' ? 'Cash' : m === 'UPI' ? 'UPI' : 'Card'}</button>
              ))}
            </div>
          </div>
          <dl className="space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Discount ₹</dt><dd><input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input w-28 px-2 py-1 text-right" /></dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-serif text-[30px] leading-none"><dt>Total</dt><dd>{formatINR(total)}</dd></div>
          </dl>
          {method === 'CASH' && (
            <Field label="Cash received">
              <input type="number" min="0" value={tendered} onChange={(e) => setTendered(e.target.value)} className="input" />
              {change > 0 && <p className="mt-1 text-[14px] font-medium text-success">Change to return: {formatINR(change)}</p>}
            </Field>
          )}
          <button type="button" disabled={!lines.length || busy} onClick={complete} className="btn-primary w-full py-4">
            {busy && <Loader2 size={16} className="animate-spin" />} Complete Sale · {formatINR(total)}
          </button>
        </div>
      </Card>
    </div>
  );
}
