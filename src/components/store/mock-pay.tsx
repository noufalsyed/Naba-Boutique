'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatINR } from '@/lib/format';

export function MockPay({ providerOrderId, orderNumber, accessKey, amount }: { providerOrderId: string; orderNumber: string; accessKey: string; amount: number }) {
  const [busy, setBusy] = useState<'' | 'success' | 'failure'>('');
  const [method, setMethod] = useState('UPI');
  const go = async (outcome: 'success' | 'failure') => {
    setBusy(outcome);
    const back = (failed: boolean) => `/order/${orderNumber}?key=${encodeURIComponent(accessKey)}${failed ? '&payment=failed' : ''}`;
    try {
      const signed = await api<{ providerOrderId: string; providerPaymentId: string; signature: string }>('/api/payments/mock/complete', { providerOrderId, outcome });
      const v = await api<{ ok: boolean }>('/api/payments/verify', signed);
      window.location.href = back(!v.ok);
    } catch {
      window.location.href = back(true);
    }
  };
  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md border border-line bg-white p-7 shadow-[0_30px_60px_-40px_rgba(42,38,36,.5)]">
        <p className="bg-warn/10 px-3 py-2 text-center text-[12px] text-warn">TEST MODE — no real money moves. Configure Razorpay keys to accept real payments.</p>
        <h1 className="mt-5 text-[30px]">Secure Payment</h1>
        <p className="text-[14px] text-muted">Order {orderNumber}</p>
        <p className="mt-4 text-[32px] font-medium">{formatINR(amount)}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-[13px]">
          {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'].map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)} className={`chip py-3 ${method === m ? 'chip-active' : ''}`}>
              {m}
            </button>
          ))}
        </div>
        <button type="button" disabled={!!busy} onClick={() => go('success')} className="btn-primary mt-6 w-full py-4">
          {busy === 'success' && <Loader2 size={16} className="animate-spin" />} Pay {formatINR(amount)} with {method}
        </button>
        <button type="button" disabled={!!busy} onClick={() => go('failure')} className="btn-outline mt-2 w-full py-3">
          {busy === 'failure' && <Loader2 size={16} className="animate-spin" />} Simulate failed payment
        </button>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-muted">
          <ShieldCheck size={14} /> Verified on the server before the order is marked paid
        </p>
      </div>
    </div>
  );
}
