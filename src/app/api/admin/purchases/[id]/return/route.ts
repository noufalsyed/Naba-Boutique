import { adminApi } from '@/server/http';
import { createPurchaseReturn } from '@/server/purchases';
import { purchaseReturnInput } from '@/lib/validators';

export const POST = adminApi<{ id: string }>('ADMIN', async ({ params, body, admin }) => {
  const r = await createPurchaseReturn(params.id, await body(purchaseReturnInput), admin.name);
  return { number: r.number };
});
