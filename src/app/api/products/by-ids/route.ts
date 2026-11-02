import { z } from 'zod';
import { publicApi } from '@/server/http';
import { listProducts } from '@/server/catalog';

/** Product cards for the wishlist (ids from the browser's local storage). */
export const GET = publicApi(async ({ query }) => {
  const { ids } = query(z.object({ ids: z.string().max(2000).default('') }));
  const wanted = new Set(ids.split(',').filter(Boolean).slice(0, 60));
  if (!wanted.size) return [];
  return (await listProducts({})).filter((p) => wanted.has(p.id));
});
