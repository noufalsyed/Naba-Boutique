import { z } from 'zod';
import { publicApi } from '@/server/http';
import { requestPasswordReset } from '@/server/auth/login';
import { email } from '@/lib/validators';

export const POST = publicApi(async ({ body, ip }) => {
  const input = await body(z.object({ email }));
  await requestPasswordReset(input.email, ip);
  return { ok: true };
});
