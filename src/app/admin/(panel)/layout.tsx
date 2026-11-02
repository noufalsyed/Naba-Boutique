import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';
import { requireAdmin } from '@/server/auth/guard';

export const metadata: Metadata = { title: { default: 'Back Office', template: '%s · Feathers Admin' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell user={{ name: admin.name, role: admin.role }}>{children}</AdminShell>;
}
