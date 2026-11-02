// Razorpay: UPI, credit/debit cards, net banking and wallets.
// Docs: https://razorpay.com/docs/payments/server-integration/
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, VerifyResult, WebhookEvent } from '@/server/payments/provider';

const API = 'https://api.razorpay.com/v1';

function creds() {
  const key = process.env.PAYMENT_GATEWAY_KEY;
  const secret = process.env.PAYMENT_GATEWAY_SECRET;
  if (!key || !secret) throw new Error('PAYMENT_GATEWAY_KEY and PAYMENT_GATEWAY_SECRET must be set for Razorpay');
  return { key, secret };
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { key, secret } = creds();
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(`Razorpay ${path}: ${res.status} ${json.error?.description ?? ''}`);
  return json;
}

export const safeEqualHex = (a: string, b: string) => {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
};

interface RzpPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  error_description?: string | null;
}

export const razorpay: PaymentProvider = {
  name: 'razorpay',

  async createPayment({ amountPaise, receipt, orderId }) {
    const o = await call<{ id: string }>('/orders', { method: 'POST', body: { amount: amountPaise, currency: 'INR', receipt, notes: { orderId } } });
    return { providerOrderId: o.id };
  },

  checkoutConfig({ providerOrderId, amountPaise }) {
    return { type: 'razorpay', key: creds().key, providerOrderId, amountPaise, currency: 'INR' };
  },

  async verifyPayment({ providerOrderId, providerPaymentId, signature, expectedAmountPaise }): Promise<VerifyResult> {
    const expected = createHmac('sha256', creds().secret).update(`${providerOrderId}|${providerPaymentId}`).digest('hex');
    if (!safeEqualHex(expected, signature)) return { ok: false, reason: 'Signature mismatch' };
    // The signature proves the callback came from Razorpay; the API lookup proves the money moved.
    let p = await call<RzpPayment>(`/payments/${encodeURIComponent(providerPaymentId)}`);
    if (p.order_id !== providerOrderId) return { ok: false, reason: 'Payment belongs to a different order' };
    if (p.amount !== expectedAmountPaise || p.currency !== 'INR') return { ok: false, reason: 'Amount mismatch' };
    if (p.status === 'authorized') {
      p = await call<RzpPayment>(`/payments/${encodeURIComponent(providerPaymentId)}/capture`, { method: 'POST', body: { amount: p.amount, currency: 'INR' } });
    }
    if (p.status !== 'captured') return { ok: false, reason: p.error_description || `Payment ${p.status}` };
    return { ok: true, providerPaymentId: p.id, method: p.method ?? null, amountPaise: p.amount };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookEvent | null> {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const sig = headers.get('x-razorpay-signature');
    if (!secret || !sig) return null;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqualHex(expected, sig)) return null;
    const body = JSON.parse(rawBody) as { event: string; payload?: { payment?: { entity?: RzpPayment } } };
    const p = body.payload?.payment?.entity;
    if (!p?.order_id) return null;
    if (body.event === 'payment.captured' || body.event === 'order.paid') {
      return { kind: 'paid', providerOrderId: p.order_id, providerPaymentId: p.id, method: p.method ?? null, amountPaise: p.amount };
    }
    if (body.event === 'payment.failed') {
      return { kind: 'failed', providerOrderId: p.order_id, providerPaymentId: p.id, method: p.method ?? null, amountPaise: p.amount, reason: p.error_description ?? 'Payment failed' };
    }
    return null;
  },
};
