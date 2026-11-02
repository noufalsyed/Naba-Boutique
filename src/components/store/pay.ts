'use client';

import { api } from '@/lib/api-client';

type Checkout =
  | { type: 'razorpay'; key: string; providerOrderId: string; amountPaise: number; currency: 'INR' }
  | { type: 'redirect'; url: string };

interface StartResult {
  orderNumber: string;
  amount: number;
  customer: { name: string; phone: string; email: string | null };
  checkout: Checkout;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'));
    document.body.appendChild(s);
  });
}

const orderUrl = (number: string, key: string, failed = false) => `/order/${encodeURIComponent(number)}?key=${encodeURIComponent(key)}${failed ? '&payment=failed' : ''}`;

/** Opens the gateway for an order. Ends by navigating to the order page (confirmed or failed). */
export async function payForOrder(number: string, key: string) {
  const start = await api<StartResult>('/api/payments/start', { number, key });
  const c = start.checkout;
  if (c.type === 'redirect') {
    window.location.href = c.url;
    return;
  }
  await loadRazorpay();
  await new Promise<void>((resolve) => {
    let settled = false;
    const fail = async (reason: string) => {
      if (settled) return;
      settled = true;
      await api('/api/payments/fail', { providerOrderId: c.providerOrderId, reason }).catch(() => {});
      window.location.href = orderUrl(number, key, true);
      resolve();
    };
    const rzp = new window.Razorpay!({
      key: c.key,
      amount: c.amountPaise,
      currency: c.currency,
      order_id: c.providerOrderId,
      name: 'Feathers – The 2nd Skin',
      description: `Order ${number}`,
      prefill: { name: start.customer.name, contact: start.customer.phone, email: start.customer.email ?? undefined },
      theme: { color: '#7a2e3f' },
      handler: async (r: RazorpayResponse) => {
        settled = true;
        try {
          const v = await api<{ ok: boolean }>('/api/payments/verify', { providerOrderId: r.razorpay_order_id, providerPaymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
          window.location.href = orderUrl(number, key, !v.ok);
        } catch {
          window.location.href = orderUrl(number, key);
        }
        resolve();
      },
      modal: { ondismiss: () => fail('Payment window closed') },
    });
    rzp.on('payment.failed', (r) => fail(r.error?.description ?? 'Payment failed'));
    rzp.open();
  });
}
