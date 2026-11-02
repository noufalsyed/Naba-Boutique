import { z } from 'zod';
import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { badRequest } from '@/server/errors';
import { hashPassword, passwordProblem, verifyPassword } from '@/server/auth/password';

/** Change own password; signs out other sessions. */
export const POST = adminApi('ANY', async ({ body, admin }) => {
  const input = await body(z.object({ current: z.string().max(200), password: z.string().max(200) }));
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await verifyPassword(input.current, user.passwordHash))) throw badRequest('Current password is incorrect', { current: 'Current password is incorrect' });
  const problem = passwordProblem(input.password);
  if (problem) throw badRequest(problem, { password: problem });
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(input.password) } }),
    prisma.adminSession.updateMany({ where: { userId: admin.id, revokedAt: null, id: { not: admin.sessionId } }, data: { revokedAt: new Date() } }),
  ]);
  return { ok: true };
});
