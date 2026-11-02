import fs from 'node:fs/promises';
import path from 'node:path';
import { getAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { safeResolve, storageRoot } from '@/server/storage';

/** Customer stitching photos are private: staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return new Response('Unauthorized', { status: 401 });
  const img = await prisma.stitchingImage.findUnique({ where: { id: (await params).id } });
  const file = img ? safeResolve(path.join(storageRoot(), 'private'), img.path) : null;
  if (!file) return new Response('Not found', { status: 404 });
  try {
    return new Response(new Uint8Array(await fs.readFile(file)), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
