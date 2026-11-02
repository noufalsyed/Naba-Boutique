import Link from 'next/link';
import type { StitchingStatus } from '@prisma/client';
import { Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { Table, Td, Th } from '@/components/admin/table';
import { StitchingBadge } from '@/components/admin/status';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { formatDateTime } from '@/lib/format';
import { STITCHING_STATUS_LABEL } from '@/lib/constants';

export const metadata = { title: 'Stitching Requests' };

export default async function StitchingListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const rows = await prisma.stitchingRequest.findMany({
    where: status ? { status: status as StitchingStatus } : { status: { in: ['NEW', 'CONTACTED', 'IN_PROGRESS'] } },
    include: { _count: { select: { images: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return (
    <>
      <PageHeader title="Stitching Requests" subtitle="Custom stitching requests from the website." />
      <div className="mb-4 flex flex-wrap gap-2 text-[13px]">
        <Link href="/admin/stitching" className={`chip ${!status ? 'chip-active' : ''}`}>Open</Link>
        {Object.entries(STITCHING_STATUS_LABEL).map(([k, l]) => (
          <Link key={k} href={`/admin/stitching?status=${k}`} className={`chip ${status === k ? 'chip-active' : ''}`}>{l}</Link>
        ))}
      </div>
      <Card>
        {rows.length ? (
          <Table>
            <thead><tr><Th>Request</Th><Th>Date</Th><Th>Customer</Th><Th>Material</Th><Th>Style</Th><Th right>Images</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-sand/40">
                  <Td><Link href={`/admin/stitching/${r.id}`} className="font-medium text-wine">{r.number}</Link></Td>
                  <Td className="text-[12.5px] whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
                  <Td>{r.name}<div className="text-[12px] text-muted">{r.phone}</div></Td>
                  <Td className="max-w-[220px] truncate">{r.material ?? '—'}</Td>
                  <Td>{r.stitchingStyle ?? '—'}</Td>
                  <Td right>{r._count.images}</Td>
                  <Td><StitchingBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No stitching requests here" />
        )}
      </Card>
    </>
  );
}
