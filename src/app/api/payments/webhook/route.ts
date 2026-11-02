import { NextResponse } from 'next/server';
import { handleWebhook } from '@/server/payments';

// Gateway → server notification. Signature checked against PAYMENT_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 200_000) return NextResponse.json({ ok: false }, { status: 413 });
  try {
    const r = await handleWebhook(raw, req.headers);
    return NextResponse.json({ ok: true, handled: r.handled });
  } catch (e) {
    console.error('[webhook]', e);
    // A 500 makes the gateway retry later.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
