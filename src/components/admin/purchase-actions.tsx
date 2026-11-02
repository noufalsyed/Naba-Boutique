'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Pencil, Undo2, XCircle } from 'lucide-react';
import { Field, Modal, PrintButton, SubmitButton, useAction } from '@/components/admin/ui';

interface Item {
  id: string;
  productName: string;
  sku: string;
  size: string;
  quantity: number;
  returnedQty: number;
}

export function PurchaseActions({ id, status, items, autoPrint }: { id: string; status: string; items: Item[]; autoPrint?: boolean }) {
  const { run, busy } = useAction();
  const [ret, setRet] = useState(false);
  useEffect(() => {
    if (autoPrint) setTimeout(() => window.print(), 400);
  }, [autoPrint]);
  return (
    <>
      <PrintButton />
      {status === 'DRAFT' && (
        <>
          <Link href={`/admin/purchases/${id}/edit`} className="btn-outline px-4 py-2.5"><Pencil size={14} /> Edit</Link>
          <button type="button" disabled={busy} onClick={() => confirm('Cancel this draft purchase?') && run(`/api/admin/purchases/${id}/cancel`, {}, { success: 'Purchase cancelled' })} className="btn-outline px-4 py-2.5"><XCircle size={15} /> Cancel</button>
          <button type="button" disabled={busy} onClick={() => confirm('Receive this purchase and add it to stock?') && run(`/api/admin/purchases/${id}/receive`, {}, { success: 'Stock received' })} className="btn-primary px-4 py-2.5"><CheckCircle2 size={15} /> Receive Stock</button>
        </>
      )}
      {status === 'RECEIVED' && items.some((i) => i.quantity > i.returnedQty) && (
        <button type="button" onClick={() => setRet(true)} className="btn-outline px-4 py-2.5"><Undo2 size={15} /> Purchase Return</button>
      )}
      {ret && <PurchaseReturnModal id={id} items={items} onClose={() => setRet(false)} />}
    </>
  );
}

function PurchaseReturnModal({ id, items, onClose }: { id: string; items: Item[]; onClose: () => void }) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const { run, busy } = useAction();
  const lines = items.filter((i) => i.quantity > i.returnedQty);
  const chosen = lines.map((i) => ({ purchaseItemId: i.id, quantity: Number(qty[i.id] || 0) })).filter((x) => x.quantity > 0);
  return (
    <Modal title="Return Stock to Supplier" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run('/api/admin/purchases/' + id + '/return', { reason, items: chosen }, { success: 'Purchase return recorded — stock reduced' });
          if (r) onClose();
        }}
      >
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-left text-[11px] uppercase text-muted"><th className="py-1">Item</th><th>Returnable</th><th>Return qty</th></tr></thead>
          <tbody>
            {lines.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="py-2">{i.productName}<div className="text-[11.5px] text-muted">{i.sku} · {i.size}</div></td>
                <td>{i.quantity - i.returnedQty}</td>
                <td><input type="number" min="0" max={i.quantity - i.returnedQty} value={qty[i.id] ?? ''} onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} className="input w-20 px-2 py-1.5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="E.g. defective pieces" className="input" /></Field>
        <SubmitButton busy={busy} disabled={!chosen.length} className="btn-primary w-full">Record Purchase Return</SubmitButton>
      </form>
    </Modal>
  );
}
