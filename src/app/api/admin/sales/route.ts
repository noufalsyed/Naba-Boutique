import { adminApi } from '@/server/http';
import { createStoreSale } from '@/server/orders';
import { storeSaleInput } from '@/lib/validators';

/** Counter sale by the cashier. */
export const POST = adminApi('ANY', async ({ body, admin }) => {
  const o = await createStoreSale(await body(storeSaleInput), admin.name);
  return { id: o.id, number: o.number };
});
