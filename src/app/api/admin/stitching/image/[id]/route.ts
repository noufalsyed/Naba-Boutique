import { getAdmin } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { readStored } from '@/server/storage';

/** Customer stitching photos are private: staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return new Response('Unauthorized', { status: 401 });
  const img = await prisma.stitchingImage.findUnique({ where: { id: (await params).id } });
  const data = img ? await readStored(`private/${img.path}`) : null;
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' } });
}
