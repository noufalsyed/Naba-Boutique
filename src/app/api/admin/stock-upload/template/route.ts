import { getAdmin } from '@/server/auth/session';
import { buildTemplate } from '@/server/excel';

export async function GET() {
  const admin = await getAdmin();
  if (!admin || admin.role !== 'ADMIN') return new Response('Unauthorized', { status: 401 });
  const buf = await buildTemplate();
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="feathers-stock-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
