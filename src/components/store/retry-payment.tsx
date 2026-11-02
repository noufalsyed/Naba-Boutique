'use client';

import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { payForOrder } from '@/components/store/pay';
import { useStore } from '@/components/store/store-provider';

export function RetryPayment({ number, accessKey, label = 'Try Again' }: { number: string; accessKey: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useStore();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await payForOrder(number, accessKey);
        } catch (e) {
          toast({ message: e instanceof Error ? e.message : 'Could not start payment', tone: 'error' });
          setBusy(false);
        }
      }}
      className="btn-primary px-8 py-4"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={15} />} {label}
    </button>
  );
}
