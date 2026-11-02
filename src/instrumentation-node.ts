// Releases stock held by unpaid orders whose time ran out, every 5 minutes.
import { releaseExpiredReservations } from '@/server/orders';

if (process.env.DISABLE_BACKGROUND_JOBS !== 'true') {
  const run = () => releaseExpiredReservations().catch((e) => console.error('[maintenance]', e));
  setTimeout(run, 15_000);
  setInterval(run, 5 * 60_000).unref();
}
