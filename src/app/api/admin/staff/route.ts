import { adminApi } from '@/server/http';
import { prisma } from '@/server/db';
import { badRequest } from '@/server/errors';
import { hashPassword, passwordProblem } from '@/server/auth/password';
import { staffInput } from '@/lib/validators';

export const POST = adminApi('ADMIN', async ({ body }) => {
  const input = await body(staffInput);
  const problem = passwordProblem(input.password ?? '');
  if (problem) throw badRequest(problem, { password: problem });
  const u = await prisma.adminUser.create({ data: { name: input.name, email: input.email, role: input.role, isActive: input.isActive, passwordHash: await hashPassword(input.password!) } });
  return { id: u.id };
});
