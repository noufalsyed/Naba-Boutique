'use client';

import { useState } from 'react';
import { Card, Field, SubmitButton, useAction } from '@/components/admin/ui';
import { STITCHING_STATUS_LABEL } from '@/lib/constants';

export function StitchingManage({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) {
  const [s, setS] = useState(status);
  const [notes, setNotes] = useState(adminNotes);
  const { run, busy } = useAction();
  return (
    <Card title="Update">
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(`/api/admin/stitching/${id}`, { status: s, adminNotes: notes }, { method: 'PATCH', success: 'Request updated' });
        }}
      >
        <Field label="Status">
          <select value={s} onChange={(e) => setS(e.target.value)} className="input">
            {Object.entries(STITCHING_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Internal notes"><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quoted price, delivery date, tailor…" className="input" /></Field>
        <SubmitButton busy={busy} className="btn-primary w-full">Save</SubmitButton>
      </form>
    </Card>
  );
}
