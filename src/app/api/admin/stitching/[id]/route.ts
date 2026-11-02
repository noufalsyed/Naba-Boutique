import { z } from 'zod';
import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { optText } from '@/lib/validators';

export const PATCH = adminApi<{ id: string }>('ANY', async ({ body, params }) => {
  const input = await body(z.object({ status: z.enum(['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']), adminNotes: optText(2000) }));
  return prisma.stitchingRequest.update({ where: { id: params.id }, data: { status: input.status, adminNotes: input.adminNotes ?? null } });
});
