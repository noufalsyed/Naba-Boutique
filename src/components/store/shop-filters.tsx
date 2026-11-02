'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { swatchFor } from '@/lib/constants';

export interface FacetData {
  categories: { slug: string; name: string; count: number }[];
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
}

const SORTS = [
  { v: 'newest', l: 'Newest' },
  { v: 'price-asc', l: 'Price: Low to High' },
  { v: 'price-desc', l: 'Price: High to Low' },
  { v: 'popular', l: 'Popular' },
  { v: 'best-selling', l: 'Best Selling' },
];

const PRICE_BANDS = [
  { min: '', max: '999', l: 'Under ₹1,000' },
  { min: '1000', max: '1999', l: '₹1,000 – ₹1,999' },
  { min: '2000', max: '2999', l: '₹2,000 – ₹2,999' },
  { min: '3000', max: '', l: '₹3,000 & above' },
];

export function useShopParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      next.delete(k);
      if (Array.isArray(v)) v.forEach((x) => next.append(k, x));
      else if (v) next.set(k, v);
    }
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }));
  };
  return { params, update, pending, pathname, router };
}

function FilterBody({ facets, fixedCategory }: { facets: FacetData; fixedCategory?: string }) {
  const { params, update, router } = useShopParams();
  const sizes = params.getAll('size');
  const colors = params.getAll('color');
  const toggle = (key: 'size' | 'color', list: string[], v: string) => update({ [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  const min = params.get('min') ?? '';
  const max = params.get('max') ?? '';

  return (
    <div className="space-y-8">
      <div>
        <h3 className="label">Category</h3>
        <ul className="space-y-1.5 text-[14px]">
          <li>
            <button type="button" onClick={() => router.push(`/shop${params.size ? `?${params}` : ''}`)} className={`${!fixedCategory ? 'font-medium text-wine' : 'text-ink hover:text-wine'}`}>
              All products
            </button>
          </li>
          {facets.categories.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => router.push(`/shop/${c.slug}${params.size ? `?${params}` : ''}`)}
                className={`flex w-full justify-between ${fixedCategory === c.slug ? 'font-medium text-wine' : 'text-ink hover:text-wine'}`}
              >
                {c.name} <span className="text-muted">{c.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="label">Price</h3>
        <div className="space-y-1.5 text-[14px]">
          {PRICE_BANDS.map((b) => {
            const on = min === b.min && max === b.max;
            return (
              <label key={b.l} className="flex cursor-pointer items-center gap-2.5">
                <input type="radio" name="price" checked={on} onChange={() => update({ min: b.min, max: b.max })} className="accent-wine" />
                {b.l}
              </label>
            );
          })}
          {(min || max) && (
            <button type="button" onClick={() => update({ min: null, max: null })} className="text-[12px] text-wine underline">
              Clear price
            </button>
          )}
        </div>
      </div>
      {facets.sizes.length > 0 && (
        <div>
          <h3 className="label">Size</h3>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={sizes.includes(s)} onClick={() => toggle('size', sizes, s)} className={`chip ${sizes.includes(s) ? 'chip-active' : ''}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {facets.colors.length > 0 && (
        <div>
          <h3 className="label">Colour</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13.5px]">
            {facets.colors.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={colors.includes(c)} onChange={() => toggle('color', colors, c)} className="accent-wine" />
                <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: swatchFor(c) }} />
                {c}
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="label">Availability</h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
          <input type="checkbox" checked={params.get('stock') === 'in'} onChange={(e) => update({ stock: e.target.checked ? 'in' : null })} className="accent-wine" />
          In stock only
        </label>
      </div>
    </div>
  );
}

export function ShopToolbar({ facets, total, fixedCategory }: { facets: FacetData; total: number; fixedCategory?: string }) {
  const { params, update, pending } = useShopParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => setQ(params.get('q') ?? ''), [params]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);
  const active = ['min', 'max', 'stock'].filter((k) => params.get(k)).length + params.getAll('size').length + params.getAll('color').length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 border-y border-line py-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() || null });
          }}
          className="flex flex-1 items-center gap-2 border border-line bg-white px-3 sm:max-w-sm"
        >
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="w-full bg-transparent py-2.5 text-[14px] outline-none" />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => { setQ(''); update({ q: null }); }}>
              <X size={15} className="text-muted" />
            </button>
          )}
        </form>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen(true)} className="chip flex-1 gap-2 py-2.5 lg:hidden">
            <SlidersHorizontal size={15} /> Filters {active > 0 && <span className="rounded-full bg-wine px-1.5 text-[10px] text-ivory">{active}</span>}
          </button>
          <span className={`hidden text-[13px] text-muted sm:inline ${pending ? 'opacity-50' : ''}`}>{total} products</span>
          <select aria-label="Sort by" value={params.get('sort') ?? 'newest'} onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })} className="chip flex-1 cursor-pointer py-2.5 sm:flex-none">
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                Sort: {s.l}
              </option>
            ))}
          </select>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 animate-fade-in bg-charcoal/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[86vh] animate-slide-up flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-2xl">Filters</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <FilterBody facets={facets} fixedCategory={fixedCategory} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-line p-4">
              <button type="button" onClick={() => update({ min: null, max: null, size: null, color: null, stock: null })} className="btn-outline">
                Clear all
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-primary">
                Show {total} results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterSidebar({ facets, fixedCategory }: { facets: FacetData; fixedCategory?: string }) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-28">
        <FilterBody facets={facets} fixedCategory={fixedCategory} />
      </div>
    </aside>
  );
}
