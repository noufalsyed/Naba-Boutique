'use client';

import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { ReturnModal, type ManageItem } from '@/components/admin/order-manage';

export function ReturnLauncher({ orderId, items }: { orderId: string; items: ManageItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-4 py-2.5"><Undo2 size={15} /> Start Return</button>
      {open && <ReturnModal orderId={orderId} items={items} onClose={() => setOpen(false)} />}
    </>
  );
}
