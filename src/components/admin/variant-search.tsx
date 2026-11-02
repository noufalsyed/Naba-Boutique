'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatINR } from '@/lib/format';

export interface VariantHit {
  id: string;
  sku: string;
  name: string;
  category: string;
  size: string;
  color: string;
  price: number;
  mrp: number;
  costPrice: number;
  stock: number;
  reserved: number;
  available: number;
  image: string | null;
}

/** Type-ahead search over SKUs / product names. */
export function VariantSearch({ onPick, placeholder = 'Search product name or SKU…', autoFocus = false, showStock = true }: { onPick: (v: VariantHit) => void; placeholder?: string; autoFocus?: boolean; showStock?: boolean }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<VariantHit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(() => {
      api<VariantHit[]>(`/api/admin/variants/search?q=${encodeURIComponent(q)}`)
        .then((r) => {
          setHits(r);
          setHi(0);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setBusy(false));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (v: VariantHit) => {
    onPick(v);
    setQ('');
    setHits([]);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2 border border-line bg-white px-3 focus-within:border-wine">
        {busy ? <Loader2 size={16} className="animate-spin text-muted" /> : <Search size={16} className="text-muted" />}
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            if (e.key === 'Enter' && hits[hi]) { e.preventDefault(); pick(hits[hi]); }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-[14px] outline-none"
          aria-label="Search products"
        />
      </div>
      {open && q && (
        <ul className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto border border-line bg-white shadow-xl">
          {hits.length ? (
            hits.map((v, i) => (
              <li key={v.id}>
                <button type="button" onMouseEnter={() => setHi(i)} onClick={() => pick(v)} className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[13.5px] ${i === hi ? 'bg-sand' : ''}`}>
                  <span className="relative h-10 w-8 shrink-0 bg-sand">{v.image && <Image src={v.image} alt="" fill sizes="32px" className="object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{v.name}</span>
                    <span className="text-[12px] text-muted">{v.sku} · {v.size}{v.color ? ` · ${v.color}` : ''}</span>
                  </span>
                  <span className="text-right">
                    <span className="block">{formatINR(v.price)}</span>
                    {showStock && <span className={`text-[11.5px] ${v.available > 0 ? 'text-muted' : 'text-danger'}`}>{v.available > 0 ? `${v.available} available` : 'Out of stock'}</span>}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-[13px] text-muted">{busy ? 'Searching…' : 'No matching products'}</li>
          )}
        </ul>
      )}
    </div>
  );
}
