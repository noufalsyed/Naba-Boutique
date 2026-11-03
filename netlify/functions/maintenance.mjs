// Netlify scheduled function: every 5 minutes, releases stock held by unpaid
// orders whose time ran out (the VPS does this in-process, see instrumentation-node.ts).
// Needs APP_URL and CRON_SECRET in the Netlify environment variables.
export default async () => {
  const base = process.env.APP_URL || process.env.URL;
  const res = await fetch(`${base}/api/cron/maintenance`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  if (!res.ok) console.error('[maintenance]', res.status, await res.text());
};

export const config = { schedule: '*/5 * * * *' };
