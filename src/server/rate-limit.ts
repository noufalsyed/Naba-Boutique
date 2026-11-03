// Fixed-window limiter kept in PostgreSQL, so the count is shared by every
// instance (Netlify starts many short-lived ones; a VPS restart keeps counts).
// On a VPS, Nginx adds a coarser per-IP limit in front (deploy/nginx.conf).
import { prisma } from '@/server/db';

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO rate_limits (key, count, "resetAt")
    VALUES (${key}, 1, now() + ${windowMs}::int * interval '1 millisecond')
    ON CONFLICT (key) DO UPDATE SET
      count     = CASE WHEN rate_limits."resetAt" <= now() THEN 1 ELSE rate_limits.count + 1 END,
      "resetAt" = CASE WHEN rate_limits."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE rate_limits."resetAt" END
    RETURNING count, "resetAt"`;
  const { count, resetAt } = rows[0];
  return { ok: count <= limit, retryAfter: Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) };
}

/** Deletes windows that ended over a day ago (run by the maintenance job). */
export const pruneRateLimits = () => prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86_400_000) } } });
