import { adminApi } from '@/server/http';
import { transaction } from '@/server/db';
import { adjustStock } from '@/server/stock';
import { adjustmentInput } from '@/lib/validators';

export const POST = adminApi('ADMIN', async ({ body, admin }) => {
  const input = await body(adjustmentInput);
  const newStock = await transaction((tx) => adjustStock(tx, input, admin.name));
  return { newStock };
});
