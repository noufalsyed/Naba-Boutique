import { z } from 'zod';
import { publicApi } from '@/server/http';
import { recordClientFailure } from '@/server/payments';
import { text } from '@/lib/validators';

/** Records a payment the customer abandoned or the gateway declined (informational only). */
export const POST = publicApi(async ({ body }) => {
  const { providerOrderId, reason } = await body(z.object({ providerOrderId: z.string().max(80), reason: text(200).default('Payment not completed') }));
  await recordClientFailure(providerOrderId, reason);
  return { ok: true };
});
