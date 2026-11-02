// Serves public product/category images from STORAGE_DIR/public. In
// production Nginx serves /media directly from disk (deploy/nginx.conf) and
// this route is only a fallback.
import fs from 'node:fs/promises';
import path from 'node:path';
import { safeResolve, storageRoot } from '@/server/storage';

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.avif': 'image/avif' };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join('/');
  const file = safeResolve(path.join(storageRoot(), 'public'), rel);
  const type = file ? TYPES[path.extname(file).toLowerCase()] : undefined;
  if (!file || !type) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=2592000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
