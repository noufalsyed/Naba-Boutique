'use client';

import { useState } from 'react';
import { Banknote, Undo2 } from 'lucide-react';
import { Card, Field, Modal, SubmitButton, useAction } from '@/components/admin/ui';
import { WhatsAppIcon } from '@/components/store/icons';
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type OrderStatusKey } from '@/lib/constants';
import { formatINR } from '@/lib/format';

const STAFF_STATUSES: OrderStatusKey[] = ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export interface ManageItem {
  id: string;
  productName: string;
  sku: string;
  size: string;
  quantity: number;
  returnedQty: number;
  price: number;
}

export function OrderManage(props: {
  id: string;
  status: OrderStatusKey;
  channel: string;
  paymentStatus: string;
  stockState: string;
  courier: string;
  trackingNumber: string;
  whatsappLink: string;
  items: ManageItem[];
}) {
  const { run, busy } = useAction();
  const [status, setStatus] = useState<OrderStatusKey>(STAFF_STATUSES.includes(props.status) ? props.status : 'CONFIRMED');
  const [courier, setCourier] = useState(props.courier);
  const [tracking, setTracking] = useState(props.trackingNumber);
  const [note, setNote] = useState('');
  const [pay, setPay] = useState(false);
  const [ret, setRet] = useState(false);
  const closed = props.status === 'CANCELLED';
  const canPay = !closed && props.paymentStatus !== 'PAID';
  const canReturn = props.stockState === 'COMMITTED' && !closed && props.items.some((i) => i.quantity > i.returnedQty);

  return (
    <div className="no-print space-y-5">
      {!closed && (
        <Card title="Update Order">
          <form
            className="space-y-3 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (status === 'CANCELLED' && !confirm('Cancel this order? Reserved or sold stock will be returned to stock.')) return;
              const r = await run(`/api/admin/orders/${props.id}/status`, { status, note: note || undefined, courier, trackingNumber: tracking }, { success: 'Order updated' });
              if (r) setNote('');
            }}
          >
            <Field label="Order status">
              <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatusKey)} className="input">
                {STAFF_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            {props.channel !== 'STORE' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Courier"><input value={courier} onChange={(e) => setCourier(e.target.value)} className="input" placeholder="India Post, DTDC…" /></Field>
                <Field label="Tracking no."><input value={tracking} onChange={(e) => setTracking(e.target.value)} className="input" /></Field>
              </div>
            )}
            <Field label="Note" hint={status === 'CANCELLED' && props.paymentStatus === 'PAID' ? 'Required: how the refund will be made' : undefined}>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
            </Field>
            <SubmitButton busy={busy} className={status === 'CANCELLED' ? 'btn-dark w-full' : 'btn-primary w-full'}>{status === 'CANCELLED' ? 'Cancel Order' : 'Save Status'}</SubmitButton>
            {props.stockState === 'RESERVED' && <p className="text-[12px] text-muted">Stock is reserved. Confirming takes it from stock; cancelling releases it.</p>}
            {props.stockState === 'RELEASED' && <p className="text-[12px] text-warn">The stock hold expired. Confirming will take stock only if it is still available.</p>}
          </form>
        </Card>
      )}
      <div className="flex flex-col gap-2">
        {canPay && (
          <button type="button" onClick={() => setPay(true)} className="btn-primary"><Banknote size={15} /> Record Payment</button>
        )}
        {canReturn && (
          <button type="button" onClick={() => setRet(true)} className="btn-outline"><Undo2 size={15} /> Sales Return</button>
        )}
        {props.whatsappLink && (
          <a href={props.whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><WhatsAppIcon size={16} /> Message Customer</a>
        )}
      </div>
      {pay && <PaymentModal id={props.id} onClose={() => setPay(false)} />}
      {ret && <ReturnModal orderId={props.id} items={props.items} onClose={() => setRet(false)} />}
    </div>
  );
}

function PaymentModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [method, setMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const { run, busy } = useAction();
  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(`/api/admin/orders/${id}/payment`, { method, reference: reference || undefined }, { success: 'Payment recorded — order confirmed' });
          if (r) onClose();
        }}
      >
        <p className="text-[13.5px] text-muted">Use this when the customer paid outside the website — e.g. a WhatsApp order paid by UPI. The order is confirmed and stock is taken.</p>
        <Field label="Method">
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
            {['UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'].map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
          </select>
        </Field>
        <Field label="Reference (optional)"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI transaction ID" className="input" /></Field>
        <SubmitButton busy={busy} className="btn-primary w-full">Mark as Paid</SubmitButton>
      </form>
    </Modal>
  );
}

export function ReturnModal({ orderId, items, onClose }: { orderId: string; items: ManageItem[]; onClose: () => void }) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const { run, busy } = useAction();
  const lines = items.filter((i) => i.quantity > i.returnedQty);
  const chosen = lines.map((i) => ({ orderItemId: i.id, quantity: Number(qty[i.id] || 0), restock: restock[i.id] ?? true })).filter((x) => x.quantity > 0);
  const estimate = chosen.reduce((s, c) => s + (lines.find((l) => l.id === c.orderItemId)?.price ?? 0) * c.quantity, 0);
  return (
    <Modal title="Sales Return" onClose={onClose} wide>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run('/api/admin/returns', { orderId, reason: reason || undefined, refundMethod: method, items: chosen }, { success: 'Return recorded' });
          if (r) onClose();
        }}
      >
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-left text-[11px] uppercase text-muted"><th className="py-1">Item</th><th>Sold</th><th>Return qty</th><th>Back to stock</th></tr></thead>
          <tbody>
            {lines.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="py-2">{i.productName}<div className="text-[11.5px] text-muted">{i.sku} · {i.size} · {formatINR(i.price)}</div></td>
                <td>{i.quantity - i.returnedQty}</td>
                <td><input type="number" min="0" max={i.quantity - i.returnedQty} value={qty[i.id] ?? ''} onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} className="input w-20 px-2 py-1.5" /></td>
                <td><label className="flex items-center gap-1.5 text-[12.5px]"><input type="checkbox" checked={restock[i.id] ?? true} onChange={(e) => setRestock({ ...restock, [i.id]: e.target.checked })} className="accent-wine" /> Restock</label></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[12px] text-muted">Untick “Restock” for damaged items — they are recorded as returned but not added back to sellable stock.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Refund method">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
              {['CASH', 'UPI', 'CARD', 'ONLINE', 'BANK_TRANSFER', 'OTHER'].map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
            </select>
          </Field>
          <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Size issue, defect…" className="input" /></Field>
        </div>
        <SubmitButton busy={busy} disabled={!chosen.length} className="btn-primary w-full">Record Return{estimate ? ` (about ${formatINR(estimate)})` : ''}</SubmitButton>
      </form>
    </Modal>
  );
}
