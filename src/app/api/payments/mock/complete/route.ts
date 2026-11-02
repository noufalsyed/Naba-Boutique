import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { publicApi } from '@/server/http';
import { forbidden } from '@/server/errors';
import { mockEnabled, mockSign } from '@/server/payments/mock';

/** Test gateway only: plays the role of the bank, returning a signed result. */
export const POST = publicApi(async ({ body }) => {
  if (!mockEnabled() || (process.env.PAYMENT_GATEWAY || 'mock') !== 'mock') throw forbidden('Test payments are disabled');
  const { providerOrderId, outcome } = await body(z.object({ providerOrderId: z.string().regex(/^mock_order_[a-f0-9]+$/), outcome: z.enum(['success', 'failure']) }));
  const providerPaymentId = `${outcome === 'success' ? 'mock_pay_' : 'mock_fail_'}${randomBytes(8).toString('hex')}`;
  return { providerOrderId, providerPaymentId, signature: mockSign(providerOrderId, providerPaymentId) };
});
