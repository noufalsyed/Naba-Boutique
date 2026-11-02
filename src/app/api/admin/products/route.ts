import { adminApi } from '@/server/http';
import { saveProduct } from '@/server/products';
import { productInput } from '@/lib/validators';

export const POST = adminApi('ADMIN', async ({ body, admin }) => {
  const p = await saveProduct(await body(productInput), admin.name);
  return { id: p.id };
});
