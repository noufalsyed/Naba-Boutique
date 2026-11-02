// Development / test gateway. Behaves like a real gateway (separate payment
// page, signed callback, server-side verification) without moving money.
// Refused in production unless ALLOW_MOCK_PAYMENTS=true.
import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import type { PaymentProvider } from '@/server/payments/provider';
import { safeEqualHex } from '@/server/payments/razorpay';

export const mockEnabled = () => process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENTS === 'true';

const secret = () => `mock:${process.env.AUTH_SECRET ?? ''}`;
export const mockSign = (providerOrderId: string, providerPaymentId: string) =>
  createHmac('sha256', secret()).update(`${providerOrderId}|${providerPaymentId}`).digest('hex');

export const mock: PaymentProvider = {
  name: 'mock',

  async createPayment() {
    if (!mockEnabled()) throw new Error('Mock payments are disabled in production');
    return { providerOrderId: `mock_order_${randomBytes(9).toString('hex')}` };
  },

  checkoutConfig({ providerOrderId, orderNumber, orderKey }) {
    return { type: 'redirect', url: `/pay/mock?po=${providerOrderId}&order=${encodeURIComponent(orderNumber)}&key=${encodeURIComponent(orderKey)}` };
  },

  async verifyPayment({ providerOrderId, providerPaymentId, signature, expectedAmountPaise }) {
    if (!mockEnabled()) return { ok: false, reason: 'Mock payments are disabled' };
    if (!safeEqualHex(mockSign(providerOrderId, providerPaymentId), signature)) return { ok: false, reason: 'Signature mismatch' };
    if (providerPaymentId.startsWith('mock_fail_')) return { ok: false, reason: 'Payment declined by bank (test)' };
    return { ok: true, providerPaymentId, method: 'upi', amountPaise: expectedAmountPaise };
  },

  async parseWebhook() {
    return null;
  },
};
