import { adminApi } from '@/server/http';
import { updateOrderStatus } from '@/server/orders';
import { orderStatusInput } from '@/lib/validators';

export const POST = adminApi<{ id: string }>('ANY', async ({ body, params, admin }) => {
  const o = await updateOrderStatus(params.id, await body(orderStatusInput), admin.name);
  return { status: o.status };
});
