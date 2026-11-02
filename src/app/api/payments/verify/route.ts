import { z } from 'zod';
import { publicApi } from '@/server/http';
import { tooMany } from '@/server/errors';
import { rateLimit } from '@/server/rate-limit';
import { verifyClientPayment } from '@/server/payments';

/** Browser callback after checkout. Payment is confirmed with the gateway here, never trusted from the browser. */
export const POST = publicApi(async ({ body, ip }) => {
  if (!rateLimit(`payverify:${ip}`, 30, 10 * 60_000).ok) throw tooMany();
  const input = await body(z.object({ providerOrderId: z.string().max(80), providerPaymentId: z.string().max(80), signature: z.string().max(200) }));
  const r = await verifyClientPayment(input);
  return { ok: r.ok, reason: r.ok ? undefined : r.reason, number: r.order.number, key: r.order.accessKey };
});
