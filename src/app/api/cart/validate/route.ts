import { z } from 'zod';
import { publicApi } from '@/server/http';
import { priceCart } from '@/server/orders';
import { cartLines } from '@/lib/validators';

/** Current prices and stock for the browser's cart. */
export const POST = publicApi(async ({ body }) => {
  const { lines } = await body(z.object({ lines: cartLines }));
  const { lines: priced, problems } = await priceCart(lines);
  return {
    items: priced.map((l) => ({ variantId: l.variantId, price: l.price, mrp: l.mrp, available: l.available, sku: l.sku, size: l.size, color: l.color, name: l.productName })),
    problems,
  };
});
