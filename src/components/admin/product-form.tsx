'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, Wand2 } from 'lucide-react';
import { Card, Field, SubmitButton, useAction, useToast } from '@/components/admin/ui';
import { api } from '@/lib/api-client';
import { discountPercent } from '@/lib/pricing';
import { blankVariant, type ProductFormValue, type VariantRow } from '@/lib/product-form';

export type { ProductFormValue, VariantRow };

export function ProductForm({ initial, categories, suppliers, canDelete }: { initial: ProductFormValue; categories: { id: string; name: string }[]; suppliers: { id: string; name: string }[]; canDelete: boolean }) {
  const [v, setV] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [gen, setGen] = useState({ sizes: 'S, M, L, XL, XXL', colors: '' });
  const { run, busy, errors } = useAction();
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setVariant = (i: number, patch: Partial<VariantRow>) => setV((x) => ({ ...x, variants: x.variants.map((r, k) => (k === i ? { ...r, ...patch } : r)) }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    [...files].slice(0, 10).forEach((f) => fd.append('file', f));
    try {
      const { urls } = await api<{ urls: string[] }>('/api/admin/uploads', fd);
      setV((x) => ({ ...x, images: [...x.images, ...urls.map((url) => ({ url, alt: '' }))].slice(0, 10) }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };
  const moveImage = (i: number, d: -1 | 1) =>
    setV((x) => {
      const imgs = [...x.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x, images: imgs };
    });

  const generate = () => {
    const sizes = gen.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = gen.colors.split(',').map((s) => s.trim()).filter(Boolean);
    const base = v.variants[0] ?? blankVariant();
    const rows: VariantRow[] = [];
    for (const c of colors.length ? colors : ['']) for (const s of sizes.length ? sizes : ['Free Size']) {
      const existing = v.variants.find((r) => r.size === s && r.color === c);
      rows.push(existing ?? blankVariant({ size: s, color: c, price: base.price, mrp: base.mrp, costPrice: base.costPrice, lowStockLevel: base.lowStockLevel }));
    }
    set('variants', rows);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...v,
      slug: v.slug || undefined,
      supplierId: v.supplierId || null,
      variants: v.variants.map((r) => ({ ...r, sku: r.sku || undefined, mrp: r.mrp || r.price, costPrice: r.costPrice || 0 })),
    };
    const r = await run<{ id: string }>(v.id ? `/api/admin/products/${v.id}` : '/api/admin/products', payload, { method: v.id ? 'PUT' : 'POST', success: 'Product saved', refresh: false });
    if (r) {
      router.push(`/admin/products/${r.id}`);
      router.refresh();
    }
  };

  const remove = async () => {
    if (!v.id || !confirm('Delete this product? Products with sales or purchase history are archived instead.')) return;
    const r = await run<{ archived: boolean }>(`/api/admin/products/${v.id}`, undefined, { method: 'DELETE', refresh: false });
    if (r) {
      toast(r.archived ? 'Product archived (it has sales history)' : 'Product deleted');
      router.push('/admin/products');
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Details" className="xl:col-span-2">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Product name" error={errors.name} className="sm:col-span-2">
              <input required maxLength={150} value={v.name} onChange={(e) => set('name', e.target.value)} className="input" />
            </Field>
            <Field label="Category" error={errors.categoryId}>
              <select required value={v.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="input">
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Subcategory" hint="Optional, e.g. Daily Wear">
              <input maxLength={80} value={v.subcategory} onChange={(e) => set('subcategory', e.target.value)} className="input" />
            </Field>
            <Field label="Short description" hint="One line shown on product cards" className="sm:col-span-2">
              <input maxLength={200} value={v.shortDesc} onChange={(e) => set('shortDesc', e.target.value)} className="input" />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea rows={5} maxLength={4000} value={v.description} onChange={(e) => set('description', e.target.value)} className="input" />
            </Field>
            <Field label="Fabric / material">
              <input maxLength={120} value={v.fabric} onChange={(e) => set('fabric', e.target.value)} className="input" />
            </Field>
            <Field label="Care instructions">
              <input maxLength={400} value={v.careNotes} onChange={(e) => set('careNotes', e.target.value)} className="input" />
            </Field>
            <Field label="URL slug" error={errors.slug} hint="Leave blank to generate from the name">
              <input maxLength={90} value={v.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="input" />
            </Field>
            <Field label="Supplier">
              <select value={v.supplierId} onChange={(e) => set('supplierId', e.target.value)} className="input">
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Visibility">
            <div className="space-y-3 p-4 text-[14px]">
              <Field label="Product status">
                <select value={v.status} onChange={(e) => set('status', e.target.value as ProductFormValue['status'])} className="input">
                  <option value="ACTIVE">Active — visible in store</option>
                  <option value="DRAFT">Draft — hidden</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </Field>
              {([['isFeatured', 'Featured product'], ['isNewArrival', 'New arrival'], ['isBestSeller', 'Best seller']] as const).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2.5">
                  <input type="checkbox" checked={v[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-wine" /> {l}
                </label>
              ))}
            </div>
          </Card>
          <Card title={`Images (${v.images.length}/10)`}>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {v.images.map((img, i) => (
                  <div key={img.url + i} className="group relative aspect-[4/5] bg-sand">
                    <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
                    {i === 0 && <span className="absolute top-1 left-1 bg-charcoal px-1.5 text-[10px] text-ivory">Main</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 p-0.5">
                      <button type="button" aria-label="Move left" onClick={() => moveImage(i, -1)} className="p-1"><ArrowUp size={13} className="-rotate-90" /></button>
                      <button type="button" aria-label="Remove image" onClick={() => set('images', v.images.filter((_, k) => k !== i))} className="p-1 text-danger"><Trash2 size={13} /></button>
                      <button type="button" aria-label="Move right" onClick={() => moveImage(i, 1)} className="p-1"><ArrowDown size={13} className="-rotate-90" /></button>
                    </div>
                  </div>
                ))}
                {v.images.length < 10 && (
                  <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-beige text-[11px] text-muted hover:border-charcoal">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={20} strokeWidth={1.4} />}
                    Upload
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
                  </label>
                )}
              </div>
              <p className="mt-2 text-[12px] text-muted">JPG/PNG/WebP up to 6 MB. Portrait 4:5 photos look best. First image is the main photo.</p>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Sizes, colours, prices & stock">
        <div className="flex flex-wrap items-end gap-2 border-b border-line bg-sand/40 p-4">
          <Field label="Sizes (comma separated)"><input value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} className="input py-2" /></Field>
          <Field label="Colours (comma separated)"><input value={gen.colors} onChange={(e) => setGen({ ...gen, colors: e.target.value })} placeholder="Navy, Maroon" className="input py-2" /></Field>
          <button type="button" onClick={generate} className="btn-outline px-4 py-2.5"><Wand2 size={15} /> Generate variants</button>
          <p className="w-full text-[12px] text-muted">Generating keeps existing rows that match. Prices are copied from the first row.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                {['Size', 'Colour', 'SKU', 'Selling ₹', 'MRP ₹', 'Disc.', 'Cost ₹', 'Low stock at', v.id ? 'Stock' : 'Opening stock', 'Active', ''].map((h) => <th key={h} className="border-b border-line px-2 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {v.variants.map((r, i) => (
                <tr key={r.id ?? `new-${i}`} className="border-b border-line/60">
                  <td className="p-1.5"><input required value={r.size} onChange={(e) => setVariant(i, { size: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                  <td className="p-1.5"><input value={r.color} onChange={(e) => setVariant(i, { color: e.target.value })} className="input w-28 px-2 py-1.5" /></td>
                  <td className="p-1.5"><input value={r.sku} placeholder="Auto" onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} className="input w-28 px-2 py-1.5" /></td>
                  <td className="p-1.5"><input required type="number" min="0" step="0.01" value={r.price} onChange={(e) => setVariant(i, { price: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                  <td className="p-1.5"><input type="number" min="0" step="0.01" value={r.mrp} onChange={(e) => setVariant(i, { mrp: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                  <td className="p-1.5 text-muted">{discountPercent(Number(r.price), Number(r.mrp)) ? `${discountPercent(Number(r.price), Number(r.mrp))}%` : '—'}</td>
                  <td className="p-1.5"><input type="number" min="0" step="0.01" value={r.costPrice} onChange={(e) => setVariant(i, { costPrice: e.target.value })} className="input w-24 px-2 py-1.5" /></td>
                  <td className="p-1.5"><input type="number" min="0" value={r.lowStockLevel} onChange={(e) => setVariant(i, { lowStockLevel: e.target.value })} className="input w-20 px-2 py-1.5" /></td>
                  <td className="p-1.5">
                    {r.id ? <span className={`px-2 ${r.stock === 0 ? 'text-danger' : ''}`}>{r.stock}</span> : <input type="number" min="0" value={r.openingStock} onChange={(e) => setVariant(i, { openingStock: e.target.value })} className="input w-20 px-2 py-1.5" />}
                  </td>
                  <td className="p-1.5 text-center"><input type="checkbox" checked={r.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} className="h-4 w-4 accent-wine" /></td>
                  <td className="p-1.5"><button type="button" aria-label="Remove variant" disabled={v.variants.length <= 1} onClick={() => set('variants', v.variants.filter((_, k) => k !== i))} className="p-1.5 text-muted hover:text-danger disabled:opacity-30"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <button type="button" onClick={() => set('variants', [...v.variants, blankVariant({ price: v.variants[0]?.price, mrp: v.variants[0]?.mrp, costPrice: v.variants[0]?.costPrice })])} className="btn-outline px-4 py-2"><Plus size={14} /> Add row</button>
          {v.id && <p className="text-[12px] text-muted">Stock changes only through purchases, sales, returns, Excel upload or <a href="/admin/stock" className="text-wine underline">stock adjustment</a>, so every change is recorded.</p>}
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div>{v.id && canDelete && <button type="button" onClick={remove} className="text-[13px] text-danger hover:underline">Delete product</button>}</div>
        <SubmitButton busy={busy} className="btn-primary px-8">Save Product</SubmitButton>
      </div>
    </form>
  );
}
