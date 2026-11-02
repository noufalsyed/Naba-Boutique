import { adminApi } from '@/server/http';
import { deleteProduct, saveProduct } from '@/server/products';
import { productInput } from '@/lib/validators';

export const PUT = adminApi<{ id: string }>('ADMIN', async ({ body, admin, params }) => {
  const p = await saveProduct(await body(productInput), admin.name, params.id);
  return { id: p.id };
});

export const DELETE = adminApi<{ id: string }>('ADMIN', async ({ params }) => deleteProduct(params.id));
