import { z } from 'zod';
import { publicApi } from '@/server/http';
import { login } from '@/server/auth/login';
import { email } from '@/lib/validators';

export const POST = publicApi(async ({ body, ip, req }) => {
  const input = await body(z.object({ email, password: z.string().min(1, 'Enter your password').max(200) }));
  await login(input.email, input.password, { ip, userAgent: req.headers.get('user-agent') ?? undefined });
  return { ok: true };
});
