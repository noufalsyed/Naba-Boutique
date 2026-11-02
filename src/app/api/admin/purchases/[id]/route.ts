import { adminApi } from '@/server/http';
import { savePurchase } from '@/server/purchases';
import { purchaseInput } from '@/lib/validators';

export const PUT = adminApi<{ id: string }>('ADMIN', async ({ body, admin, params }) => {
  const p = await savePurchase(await body(purchaseInput), admin.name, params.id);
  return { id: p.id };
});
