'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Field, Modal, SubmitButton, useAction } from '@/components/admin/ui';

export interface SupplierValue {
  id?: string;
  name: string;
  companyName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  gstin: string;
  notes: string;
  isActive: boolean;
}

const EMPTY: SupplierValue = { name: '', companyName: '', phone: '', whatsapp: '', email: '', address: '', gstin: '', notes: '', isActive: true };

export function SupplierButton({ supplier }: { supplier?: SupplierValue }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={supplier ? 'btn-outline px-4 py-2.5' : 'btn-primary px-4 py-2.5'}>
        {supplier ? <><Pencil size={14} /> Edit</> : <><Plus size={15} /> Add Supplier</>}
      </button>
      {open && <SupplierModal initial={supplier ?? EMPTY} onClose={() => setOpen(false)} />}
    </>
  );
}

function SupplierModal({ initial, onClose }: { initial: SupplierValue; onClose: () => void }) {
  const [v, setV] = useState(initial);
  const { run, busy, errors } = useAction();
  const f = (k: keyof SupplierValue, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} error={errors[k]}>
      <input value={String(v[k])} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="input" {...props} />
    </Field>
  );
  return (
    <Modal title={v.id ? 'Edit Supplier' : 'Add Supplier'} onClose={onClose}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(v.id ? `/api/admin/suppliers/${v.id}` : '/api/admin/suppliers', v, { method: v.id ? 'PUT' : 'POST', success: 'Supplier saved' });
          if (r) onClose();
        }}
      >
        {f('name', 'Supplier name', { required: true, maxLength: 120 })}
        {f('companyName', 'Company name')}
        {f('phone', 'Contact number', { type: 'tel' })}
        {f('whatsapp', 'WhatsApp', { type: 'tel' })}
        {f('email', 'Email', { type: 'email' })}
        {f('gstin', 'GST / VAT number')}
        <Field label="Address" className="sm:col-span-2"><textarea rows={2} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} className="input" /></Field>
        <Field label="Notes" className="sm:col-span-2"><input value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className="input" /></Field>
        <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} className="accent-wine" /> Active</label>
        <SubmitButton busy={busy} className="btn-primary sm:col-span-2">Save Supplier</SubmitButton>
      </form>
    </Modal>
  );
}
