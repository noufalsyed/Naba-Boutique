// Releases stock held by unpaid orders whose time ran out, every 5 minutes.
// Netlify has no long-running process; there netlify/functions/maintenance.mjs
// calls /api/cron/maintenance on a schedule instead.
import { releaseExpiredReservations } from '@/server/orders';
import { pruneRateLimits } from '@/server/rate-limit';
import { onNetlify } from '@/server/platform';

if (process.env.DISABLE_BACKGROUND_JOBS !== 'true' && !onNetlify) {
  const run = () => Promise.all([releaseExpiredReservations(), pruneRateLimits()]).catch((e) => console.error('[maintenance]', e));
  setTimeout(run, 15_000);
  setInterval(run, 5 * 60_000).unref();
}
