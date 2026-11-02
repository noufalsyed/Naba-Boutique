'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Field, Modal, SubmitButton, useAction } from '@/components/admin/ui';
import { VariantSearch, type VariantHit } from '@/components/admin/variant-search';
import { ADJUSTMENT_LABEL, ADJUSTMENT_TYPES, type AdjustmentType } from '@/lib/constants';

type Target = { id: string; sku: string; name: string; size: string; color: string; stock: number; reserved: number };

export function AdjustStockButton({ variant, label = 'Stock Adjustment', compact = false }: { variant?: Target; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? 'text-[12px] text-wine hover:underline' : 'btn-primary px-4 py-2.5'}>
        {!compact && <SlidersHorizontal size={15} />} {label}
      </button>
      {open && <AdjustStockModal initial={variant} onClose={() => setOpen(false)} />}
    </>
  );
}

function preview(type: AdjustmentType, qty: number, stock: number) {
  if (type === 'PHYSICAL_COUNT') return qty;
  if (type === 'CORRECTION') return stock + qty;
  return stock + (type === 'ADD' ? qty : -qty);
}

export function AdjustStockModal({ initial, onClose }: { initial?: Target; onClose: () => void }) {
  const [v, setV] = useState<Target | undefined>(initial);
  const [type, setType] = useState<AdjustmentType>('DAMAGED');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const { run, busy, errors } = useAction();
  const q = Number(qty) || 0;
  const next = v ? preview(type, q, v.stock) : 0;

  return (
    <Modal title="Stock Adjustment" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!v) return;
          const r = await run('/api/admin/stock/adjust', { variantId: v.id, type, quantity: q, reason }, { success: 'Stock updated' });
          if (r) onClose();
        }}
      >
        {v ? (
          <div className="flex items-start justify-between bg-sand p-3 text-[14px]">
            <div>
              <p className="font-medium">{v.name}</p>
              <p className="text-[12.5px] text-muted">SKU {v.sku} · {v.size}{v.color ? ` · ${v.color}` : ''}</p>
            </div>
            {!initial && <button type="button" onClick={() => setV(undefined)} className="text-[12px] text-wine">Change</button>}
          </div>
        ) : (
          <Field label="Product / SKU">
            <VariantSearch autoFocus onPick={(h: VariantHit) => setV(h)} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current stock"><p className="input bg-sand/50">{v?.stock ?? '—'}{v && v.reserved > 0 ? <span className="text-muted"> ({v.reserved} reserved)</span> : null}</p></Field>
          <Field label="Adjustment type">
            <select value={type} onChange={(e) => setType(e.target.value as AdjustmentType)} className="input">
              {ADJUSTMENT_TYPES.map((t) => <option key={t} value={t}>{ADJUSTMENT_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field
            label={type === 'PHYSICAL_COUNT' ? 'Counted stock' : type === 'CORRECTION' ? 'Change (+ / −)' : 'Quantity'}
            error={errors.quantity}
            hint={type === 'CORRECTION' ? 'Use a minus sign to reduce, e.g. -2' : undefined}
          >
            <input required type="number" step="1" min={type === 'CORRECTION' ? undefined : 0} value={qty} onChange={(e) => setQty(e.target.value)} className="input" />
          </Field>
          <Field label="New stock">
            <p className={`input font-medium ${next < 0 ? 'text-danger' : ''}`}>{v ? next : '—'}</p>
          </Field>
        </div>
        <Field label="Reason" error={errors.reason}>
          <input required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="E.g. stain found during display" className="input" />
        </Field>
        <SubmitButton busy={busy} disabled={!v || next < 0} className="btn-primary w-full">Save Adjustment</SubmitButton>
        <p className="text-[12px] text-muted">Every adjustment is recorded in Stock Movements with your name.</p>
      </form>
    </Modal>
  );
}
