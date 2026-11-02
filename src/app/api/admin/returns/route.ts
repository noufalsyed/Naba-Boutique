import { adminApi } from '@/server/http';
import { createSalesReturn } from '@/server/orders';
import { salesReturnInput } from '@/lib/validators';

export const POST = adminApi('ANY', async ({ body, admin }) => {
  const r = await createSalesReturn(await body(salesReturnInput), admin.name);
  return { id: r.id, number: r.number };
});
