import { adminApi } from '@/server/http';
import { receivePurchase } from '@/server/purchases';

export const POST = adminApi<{ id: string }>('ADMIN', async ({ params, admin }) => {
  await receivePurchase(params.id, admin.name);
  return { ok: true };
});
