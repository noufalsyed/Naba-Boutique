'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { Card, Field, useAction } from '@/components/admin/ui';
import { VariantSearch, type VariantHit } from '@/components/admin/variant-search';
import { formatINR, round2 } from '@/lib/format';

export interface PurchaseLine {
  key: string;
  variantId: string | null;
  productName: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  size: string;
  color: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  mrp: string;
  discount: string;
  currentStock?: number;
}

export interface PurchaseFormValue {
  id?: string;
  supplierId: string;
  supplierContact: string;
  invoiceNumber: string;
  purchaseDate: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  discount: string;
  additionalCharges: string;
  notes: string;
  items: PurchaseLine[];
}

const num = (s: string) => Number(s) || 0;
const lineTotal = (l: PurchaseLine) => round2(num(l.quantity) * num(l.purchasePrice) - num(l.discount));
let seq = 0;
const key = () => `l${++seq}`;

export function PurchaseForm({ initial, suppliers, categories }: { initial: PurchaseFormValue; suppliers: { id: string; name: string; phone: string | null }[]; categories: { id: string; name: string }[] }) {
  const [v, setV] = useState(initial);
  const { run, busy, errors } = useAction();
  const [mode, setMode] = useState<'draft' | 'receive'>('receive');
  const router = useRouter();
  const set = <K extends keyof PurchaseFormValue>(k: K, val: PurchaseFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setLine = (k: string, patch: Partial<PurchaseLine>) => setV((x) => ({ ...x, items: x.items.map((l) => (l.key === k ? { ...l, ...patch } : l)) }));

  const addExisting = (h: VariantHit) =>
    setV((x) => ({
      ...x,
      items: [
        ...x.items,
        { key: key(), variantId: h.id, productName: h.name, sku: h.sku, categoryId: '', categoryName: h.category, size: h.size, color: h.color, quantity: '1', purchasePrice: h.costPrice ? String(h.costPrice) : '', sellingPrice: String(h.price), mrp: String(h.mrp), discount: '0', currentStock: h.stock },
      ],
    }));
  const addNew = () =>
    setV((x) => ({ ...x, items: [...x.items, { key: key(), variantId: null, productName: '', sku: '', categoryId: categories[0]?.id ?? '', categoryName: '', size: 'Free Size', color: '', quantity: '1', purchasePrice: '', sellingPrice: '', mrp: '', discount: '0' }] }));

  const subtotal = round2(v.items.reduce((s, l) => s + lineTotal(l), 0));
  const grand = round2(subtotal - num(v.discount) + num(v.additionalCharges));
  const units = v.items.reduce((s, l) => s + num(l.quantity), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'receive' && !confirm(`Receive this purchase now? ${units} unit(s) will be added to stock.`)) return;
    const payload = {
      ...v,
      receive: mode === 'receive',
      items: v.items.map((l) => ({ ...l, variantId: l.variantId, sku: l.sku || undefined, categoryId: l.variantId ? null : l.categoryId, mrp: l.mrp || null })),
    };
    const r = await run<{ id: string }>(v.id ? `/api/admin/purchases/${v.id}` : '/api/admin/purchases', payload, {
      method: v.id ? 'PUT' : 'POST',
      success: mode === 'receive' ? 'Purchase received — stock updated' : 'Draft saved',
      refresh: false,
    });
    if (r) {
      router.push(`/admin/purchases/${r.id}`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card title="Supplier details">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Supplier" error={errors.supplierId} className="lg:col-span-2">
            <select
              required
              value={v.supplierId}
              onChange={(e) => {
                const s = suppliers.find((x) => x.id === e.target.value);
                setV((x) => ({ ...x, supplierId: e.target.value, supplierContact: x.supplierContact || s?.phone || '' }));
              }}
              className="input"
            >
              <option value="">Choose supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier contact"><input value={v.supplierContact} onChange={(e) => set('supplierContact', e.target.value)} className="input" /></Field>
          <Field label="Invoice number"><input value={v.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} className="input" /></Field>
          <Field label="Purchase date"><input required type="date" value={v.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} className="input" /></Field>
          <Field label="Payment status">
            <select value={v.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value as PurchaseFormValue['paymentStatus'])} className="input">
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partially paid</option>
              <option value="PAID">Paid</option>
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2 lg:col-span-4"><input value={v.notes} onChange={(e) => set('notes', e.target.value)} className="input" /></Field>
        </div>
      </Card>

      <Card title="Products">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-sand/40 p-4">
          <div className="min-w-[280px] flex-1"><VariantSearch onPick={addExisting} placeholder="Add an existing product — search name or SKU…" /></div>
          <button type="button" onClick={addNew} className="btn-outline px-4 py-2.5"><PackagePlus size={15} /> New product line</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                {['Product', 'SKU', 'Category', 'Size', 'Colour', 'Qty', 'Purchase ₹', 'Selling ₹', 'MRP ₹', 'Discount ₹', 'Total', ''].map((h) => <th key={h} className="border-b border-line px-2 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {v.items.map((l) => {
                const isNew = !l.variantId;
                const ro = 'input px-2 py-1.5 bg-sand/40';
                return (
                  <tr key={l.key} className="border-b border-line/60 align-top">
                    <td className="p-1.5">
                      {isNew ? <input required placeholder="Product name" value={l.productName} onChange={(e) => setLine(l.key, { productName: e.target.value })} className="input w-48 px-2 py-1.5" /> : <div className="w-48 py-1.5"><p className="font-medium">{l.productName}</p><p className="text-[11.5px] text-muted">In stock: {l.currentStock} → {(l.currentStock ?? 0) + num(l.quantity)}</p></div>}
                    </td>
                    <td className="p-1.5">{isNew ? <input placeholder="Auto" value={l.sku} onChange={(e) => setLine(l.key, { sku: e.target.value.toUpperCase() })} className="input w-24 px-2 py-1.5" /> : <span className="block py-1.5 font-mono">{l.sku}</span>}</td>
                    <td className="p-1.5">
                      {isNew ? (
                        <select value={l.categoryId} onChange={(e) => setLine(l.key, { categoryId: e.target.value })} className="input w-32 px-2 py-1.5">
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : <span className="block py-1.5">{l.categoryName}</span>}
                    </td>
                    <td className="p-1.5"><input disabled={!isNew} value={l.size} onChange={(e) => setLine(l.key, { size: e.target.value })} className={`${isNew ? 'input px-2 py-1.5' : ro} w-20`} /></td>
                    <td className="p-1.5"><input disabled={!isNew} value={l.color} onChange={(e) => setLine(l.key, { color: e.target.value })} className={`${isNew ? 'input px-2 py-1.5' : ro} w-24`} /></td>
                    <td className="p-1.5"><input required type="number" min="1" step="1" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} className="input w-16 px-2 py-1.5" /></td>
                    <td className="p-1.5"><input required type="number" min="0" step="0.01" value={l.purchasePrice} onChange={(e) => setLine(l.key, { purchasePrice: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                    <td className="p-1.5"><input required type="number" min="0" step="0.01" value={l.sellingPrice} onChange={(e) => setLine(l.key, { sellingPrice: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                    <td className="p-1.5"><input type="number" min="0" step="0.01" value={l.mrp} onChange={(e) => setLine(l.key, { mrp: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                    <td className="p-1.5"><input type="number" min="0" step="0.01" value={l.discount} onChange={(e) => setLine(l.key, { discount: e.target.value })} className="input w-20 px-2 py-1.5" /></td>
                    <td className="p-1.5 py-3 text-right font-medium whitespace-nowrap">{formatINR(lineTotal(l))}</td>
                    <td className="p-1.5"><button type="button" aria-label="Remove line" onClick={() => set('items', v.items.filter((x) => x.key !== l.key))} className="p-1.5 text-muted hover:text-danger"><Trash2 size={15} /></button></td>
                  </tr>
                );
              })}
              {!v.items.length && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-muted">Search above to add existing products, or add a new product line. <button type="button" onClick={addNew} className="text-wine underline"><Plus size={12} className="inline" /> New line</button></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-line p-4">
          <dl className="w-full max-w-xs space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal ({units} units)</dt><dd>{formatINR(subtotal)}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Discount</dt><dd><input type="number" min="0" step="0.01" value={v.discount} onChange={(e) => set('discount', e.target.value)} className="input w-28 px-2 py-1 text-right" /></dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Additional charges</dt><dd><input type="number" min="0" step="0.01" value={v.additionalCharges} onChange={(e) => set('additionalCharges', e.target.value)} className="input w-28 px-2 py-1 text-right" /></dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-[17px] font-medium"><dt>Grand Total</dt><dd>{formatINR(grand)}</dd></div>
          </dl>
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <p className="mr-auto text-[12.5px] text-muted">Receiving adds each line to stock (new products are created) and records a Purchase stock movement.</p>
        <button type="submit" onClick={() => setMode('draft')} disabled={busy || !v.items.length} className="btn-outline px-5">
          {busy && mode === 'draft' && <Loader2 size={15} className="animate-spin" />} Save as Draft
        </button>
        <button type="submit" onClick={() => setMode('receive')} disabled={busy || !v.items.length} className="btn-primary px-6">
          {busy && mode === 'receive' && <Loader2 size={15} className="animate-spin" />} Confirm & Receive Stock
        </button>
      </div>
    </form>
  );
}
