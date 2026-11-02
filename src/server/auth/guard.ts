import 'server-only';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/server/auth/session';

/** For admin pages: the signed-in staff member, or a redirect to login / dashboard. */
export async function requireAdmin(role: 'ADMIN' | 'ANY' = 'ANY') {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  if (role === 'ADMIN' && admin.role !== 'ADMIN') redirect('/admin?denied=1');
  return admin;
}
