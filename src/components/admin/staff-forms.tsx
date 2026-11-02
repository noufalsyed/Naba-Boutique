'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Card, Field, Modal, SubmitButton, useAction } from '@/components/admin/ui';

interface Staff {
  id?: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
  isActive: boolean;
}

export function StaffButton({ staff }: { staff?: Staff }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Staff & { password: string }>({ ...(staff ?? { name: '', email: '', role: 'CASHIER', isActive: true }), password: '' });
  const { run, busy, errors } = useAction();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={staff ? 'text-[12px] text-wine hover:underline' : 'btn-primary px-4 py-2.5'}>
        {staff ? <><Pencil size={12} className="inline" /> Edit</> : <><Plus size={15} /> Add Staff</>}
      </button>
      {open && (
        <Modal title={staff ? 'Edit Staff' : 'Add Staff'} onClose={() => setOpen(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run(staff ? `/api/admin/staff/${staff.id}` : '/api/admin/staff', { ...v, password: v.password || undefined }, { method: staff ? 'PUT' : 'POST', success: 'Staff saved' });
              if (r) setOpen(false);
            }}
          >
            <Field label="Name" error={errors.name}><input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="input" /></Field>
            <Field label="Email (login)" error={errors.email}><input required type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className="input" /></Field>
            <Field label="Role" hint="Cashiers can sell, take returns and view stock; admins manage products, purchases, suppliers, staff and all reports.">
              <select value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Staff['role'] })} className="input">
                <option value="CASHIER">Cashier</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <Field label={staff ? 'New password (leave blank to keep)' : 'Password'} error={errors.password} hint="At least 8 characters with letters and numbers">
              <input type="password" required={!staff} autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} className="input" />
            </Field>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} className="accent-wine" /> Active (can sign in)</label>
            <SubmitButton busy={busy} className="btn-primary w-full">Save</SubmitButton>
          </form>
        </Modal>
      )}
    </>
  );
}

export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { run, busy, errors, setErrors } = useAction();
  return (
    <Card title="Change Password" className="max-w-md">
      <form
        className="space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) return setErrors({ confirm: 'Passwords do not match' });
          const r = await run('/api/admin/auth/password', { current, password }, { success: 'Password changed. Other devices were signed out.' });
          if (r) {
            setCurrent('');
            setPassword('');
            setConfirm('');
          }
        }}
      >
        <Field label="Current password" error={errors.current}><input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" /></Field>
        <Field label="New password" error={errors.password} hint="At least 8 characters with letters and numbers"><input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></Field>
        <Field label="Confirm new password" error={errors.confirm}><input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" /></Field>
        <SubmitButton busy={busy} className="btn-primary w-full">Change Password</SubmitButton>
      </form>
    </Card>
  );
}
