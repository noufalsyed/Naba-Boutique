import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { releaseExpiredReservations } from '@/server/orders';

/** Releases lapsed stock holds. Also runs every 5 minutes in-process (instrumentation.ts). */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  if (!secret || got.length !== Buffer.byteLength(secret) || !timingSafeEqual(got, Buffer.from(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ data: await releaseExpiredReservations() });
}
