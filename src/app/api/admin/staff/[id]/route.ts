import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { badRequest } from '@/server/errors';
import { hashPassword, passwordProblem } from '@/server/auth/password';
import { staffInput } from '@/lib/validators';

export const PUT = adminApi<{ id: string }>('ADMIN', async ({ body, params, admin }) => {
  const input = await body(staffInput);
  if (params.id === admin.id && (input.role !== 'ADMIN' || !input.isActive)) throw badRequest('You cannot remove your own admin access');
  if (input.password) {
    const problem = passwordProblem(input.password);
    if (problem) throw badRequest(problem, { password: problem });
  }
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: params.id },
      data: { name: input.name, email: input.email, role: input.role, isActive: input.isActive, ...(input.password ? { passwordHash: await hashPassword(input.password), failedLoginCount: 0, lockedUntil: null } : {}) },
    }),
    ...(input.password || !input.isActive ? [prisma.adminSession.updateMany({ where: { userId: params.id, revokedAt: null }, data: { revokedAt: new Date() } })] : []),
  ]);
  return { ok: true };
});
