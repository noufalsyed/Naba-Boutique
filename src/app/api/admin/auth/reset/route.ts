import { z } from 'zod';
import { publicApi } from '@/server/http';
import { tooMany } from '@/server/errors';
import { rateLimit } from '@/server/rate-limit';
import { resetPassword } from '@/server/auth/login';

export const POST = publicApi(async ({ body, ip }) => {
  if (!rateLimit(`resetpw:${ip}`, 10, 15 * 60_000).ok) throw tooMany();
  const input = await body(z.object({ token: z.string().min(20).max(100), password: z.string().max(200) }));
  await resetPassword(input.token, input.password);
  return { ok: true };
});
