import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { releaseExpiredReservations } from '@/server/orders';
import { pruneRateLimits } from '@/server/rate-limit';

/**
 * Releases lapsed stock holds and prunes old rate-limit rows. On a VPS this also
 * runs every 5 minutes in-process (instrumentation-node.ts); on Netlify the
 * scheduled function netlify/functions/maintenance.mjs calls it.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  if (!secret || got.length !== Buffer.byteLength(secret) || !timingSafeEqual(got, Buffer.from(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [released] = await Promise.all([releaseExpiredReservations(), pruneRateLimits()]);
  return NextResponse.json({ data: released });
}
