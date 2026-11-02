import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/server/db';

export const SESSION_COOKIE = 'fts_admin';
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters');
  return new TextEncoder().encode(s);
}

interface Claims {
  sid: string;
  uid: string;
}

async function verifyToken(token: string): Promise<Claims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    return payload as unknown as Claims;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string }) {
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  const session = await prisma.adminSession.create({ data: { userId, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300), expiresAt } });
  const token = await new SignJWT({ sid: session.id, uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const claims = await verifyToken(token);
    if (claims) await prisma.adminSession.updateMany({ where: { id: claims.sid, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  jar.delete(SESSION_COOKIE);
}

export interface AdminAuth {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
  sessionId: string;
}

/** Signed-in staff member for this request (memoised), or null. */
export const getAdmin = cache(async (): Promise<AdminAuth | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyToken(token);
  if (!claims) return null;
  const session = await prisma.adminSession.findUnique({ where: { id: claims.sid }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role, sessionId: session.id };
});
