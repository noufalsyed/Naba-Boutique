import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import { badRequest, tooMany, unauthorized } from '@/server/errors';
import { rateLimit } from '@/server/rate-limit';
import { hashPassword, passwordProblem, verifyPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { sendMail } from '@/server/mail';
import { storeConfig } from '@/server/config';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
// Unknown emails still run a bcrypt comparison so timing does not reveal them.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password-0'));

export async function login(email: string, password: string, meta: { ip: string; userAgent?: string }) {
  if (!(await rateLimit(`login:ip:${meta.ip}`, 20, 15 * 60_000)).ok || !(await rateLimit(`login:email:${email}`, 10, 15 * 60_000)).ok) throw tooMany();
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.isActive) throw unauthorized('Email or password is incorrect');
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw unauthorized('Account locked after repeated failed attempts. Try again in 15 minutes.');
  }
  if (!ok) {
    const fails = user.failedLoginCount + 1;
    const lock = fails >= MAX_FAILS;
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginCount: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
    });
    throw unauthorized('Email or password is incorrect');
  }
  await prisma.adminUser.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id, meta);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Emails a one-hour reset link. Always succeeds so emails cannot be probed. */
export async function requestPasswordReset(email: string, ip: string) {
  if (!(await rateLimit(`reset:ip:${ip}`, 5, 15 * 60_000)).ok) throw tooMany();
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  const token = randomBytes(32).toString('base64url');
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { resetTokenHash: sha256(token), resetTokenExpiry: new Date(Date.now() + 3_600_000) },
  });
  const link = `${storeConfig().appUrl}/admin/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your NABA Boutique admin password',
    text: `Hi ${user.name},\n\nUse this link within one hour to set a new password:\n${link}\n\nIf you did not ask for this, ignore this email.`,
  });
}

export async function resetPassword(token: string, password: string) {
  const problem = passwordProblem(password);
  if (problem) throw badRequest(problem);
  const user = await prisma.adminUser.findFirst({ where: { resetTokenHash: sha256(token), resetTokenExpiry: { gt: new Date() } } });
  if (!user) throw badRequest('This reset link is invalid or has expired');
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetTokenExpiry: null, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.adminSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
