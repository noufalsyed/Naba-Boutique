import { z } from 'zod';
import { publicApi } from '@/server/http';
import { tooMany } from '@/server/errors';
import { rateLimit } from '@/server/rate-limit';
import { startPayment } from '@/server/payments';

export const POST = publicApi(async ({ body, ip }) => {
  if (!(await rateLimit(`paystart:${ip}`, 20, 10 * 60_000)).ok) throw tooMany();
  const { number, key } = await body(z.object({ number: z.string().max(30), key: z.string().max(60) }));
  return startPayment(number, key);
});
