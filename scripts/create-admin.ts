// Creates (or resets the password of) an admin account from the command line.
//   npm run admin:create -- owner@example.com "Owner Name"
// The password is read from ADMIN_PASSWORD, or a strong one is generated and printed once.
import './load-env';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import { hashPassword, passwordProblem } from '@/server/auth/password';

async function main() {
  const [emailArg, ...nameParts] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run admin:create -- you@example.com "Your Name"');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || `${randomBytes(9).toString('base64url')}7a`;
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const passwordHash = await hashPassword(password);
  const name = nameParts.join(' ') || 'Store Admin';
  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', isActive: true, failedLoginCount: 0, lockedUntil: null },
    create: { email, name, passwordHash, role: 'ADMIN' },
  });
  await prisma.adminSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  console.log(`Admin ready: ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Password: ${password}\n(Shown once — change it after signing in.)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
