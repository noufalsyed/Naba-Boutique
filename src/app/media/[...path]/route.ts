// Serves public product/category images from storage (disk or Netlify Blobs).
// On a VPS, Nginx serves /media directly from disk (deploy/nginx.conf) and
// this route is only a fallback.
import path from 'node:path';
import { readStored } from '@/server/storage';

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.avif': 'image/avif' };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join('/');
  const type = TYPES[path.extname(rel).toLowerCase()];
  const data = type ? await readStored(`public/${rel}`) : null;
  if (!data) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  // File names are unique per upload, so every copy can be cached for good.
  const cache = 'public, max-age=31536000, immutable';
  return new Response(new Uint8Array(data), {
    headers: { 'Content-Type': type, 'Cache-Control': cache, 'Netlify-CDN-Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' },
  });
}
