'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { sortSizes, swatchFor } from '@/lib/constants';
import type { CardVariant } from '@/lib/types';

export function useVariantPicker(variants: CardVariant[]) {
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color))], [variants]);
  const firstAvailable = variants.find((v) => v.available > 0) ?? variants[0];
  const [color, setColor] = useState(firstAvailable?.color ?? '');
  const [size, setSize] = useState<string | null>(variants.length === 1 ? variants[0].size : null);
  const [quantity, setQuantity] = useState(1);

  const sizes = useMemo(() => sortSizes([...new Set(variants.map((v) => v.size))]), [variants]);
  const forColor = variants.filter((v) => v.color === color);
  const selected = size ? (forColor.find((v) => v.size === size) ?? null) : null;
  const sizeAvailable = (s: string) => (forColor.find((v) => v.size === s)?.available ?? 0) > 0;

  return {
    colors,
    sizes,
    color,
    size,
    quantity,
    selected,
    sizeAvailable,
    setColor: (c: string) => {
      setColor(c);
      setQuantity(1);
      if (size && !(variants.find((v) => v.color === c && v.size === size)?.available ?? 0)) setSize(null);
    },
    setSize: (s: string) => {
      setSize(s);
      setQuantity(1);
    },
    setQuantity: (q: number) => setQuantity(Math.max(1, Math.min(q, selected?.available || 1))),
  };
}

export type Picker = ReturnType<typeof useVariantPicker>;

export function VariantPicker({ picker, onSizeChart }: { picker: Picker; onSizeChart?: () => void }) {
  const { colors, sizes, color, size, quantity, selected, sizeAvailable } = picker;
  return (
    <div className="space-y-5">
      {colors.length > 1 || colors[0] ? (
        <div>
          <p className="label">
            Colour: <span className="text-charcoal normal-case tracking-normal">{color || '—'}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => picker.setColor(c)}
                aria-label={c}
                aria-pressed={c === color}
                title={c}
                className={`h-9 w-9 rounded-full border-2 p-0.5 transition-all ${c === color ? 'border-charcoal' : 'border-transparent hover:border-beige'}`}
              >
                <span className="block h-full w-full rounded-full border border-black/10" style={{ background: swatchFor(c) }} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <div className="flex items-center justify-between">
          <p className="label">
            Size: <span className="text-charcoal normal-case tracking-normal">{size ?? 'Select a size'}</span>
          </p>
          {onSizeChart && (
            <button type="button" onClick={onSizeChart} className="mb-1.5 text-[12px] text-wine underline underline-offset-4">
              Size chart
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {sizes.map((s) => {
            const ok = sizeAvailable(s);
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={s === size}
                disabled={!ok}
                onClick={() => picker.setSize(s)}
                className={`chip min-h-11 ${s === size ? 'chip-active' : ''} ${ok ? '' : 'cursor-not-allowed text-muted/50 line-through hover:border-line'}`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {selected && selected.available > 0 && selected.available <= 3 && <p className="mt-2 text-[13px] text-warn">Only {selected.available} left — order soon</p>}
      </div>
      <div>
        <p className="label">Quantity</p>
        <div className="inline-flex items-center border border-line bg-white">
          <button type="button" aria-label="Decrease quantity" onClick={() => picker.setQuantity(quantity - 1)} className="p-3 hover:text-wine disabled:opacity-40" disabled={quantity <= 1}>
            <Minus size={15} />
          </button>
          <span className="w-10 text-center text-[15px]" aria-live="polite">
            {quantity}
          </span>
          <button type="button" aria-label="Increase quantity" onClick={() => picker.setQuantity(quantity + 1)} className="p-3 hover:text-wine disabled:opacity-40" disabled={!selected || quantity >= selected.available}>
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
