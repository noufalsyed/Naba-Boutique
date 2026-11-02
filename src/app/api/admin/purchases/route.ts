import { adminApi } from '@/server/http';
import { savePurchase } from '@/server/purchases';
import { purchaseInput } from '@/lib/validators';

export const POST = adminApi('ADMIN', async ({ body, admin }) => {
  const p = await savePurchase(await body(purchaseInput), admin.name);
  return { id: p.id };
});
