import { adminApi } from '@/server/http';
import { cancelPurchase } from '@/server/purchases';

export const POST = adminApi<{ id: string }>('ADMIN', async ({ params }) => {
  await cancelPurchase(params.id);
  return { ok: true };
});
