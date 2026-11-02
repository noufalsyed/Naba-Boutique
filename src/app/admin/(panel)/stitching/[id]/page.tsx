import { notFound } from 'next/navigation';
import { Card, PageHeader } from '@/components/admin/ui';
import { StitchingBadge } from '@/components/admin/status';
import { StitchingManage } from '@/components/admin/stitching-manage';
import { WhatsAppIcon } from '@/components/store/icons';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth/guard';
import { storeConfig } from '@/server/config';
import { formatDateTime } from '@/lib/format';
import { waLink } from '@/lib/whatsapp';

export const metadata = { title: 'Stitching Request' };

const KIND_LABEL = { REFERENCE: 'Reference design', MATERIAL: 'Material', INSPIRATION: 'Inspiration' } as const;

export default async function StitchingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const r = await prisma.stitchingRequest.findUnique({ where: { id: (await params).id }, include: { images: { orderBy: { createdAt: 'asc' } } } });
  if (!r) notFound();
  const cfg = storeConfig();
  const wa = r.whatsapp || r.phone;
  const measures = [
    ['Size', r.size], ['Bust', r.bust], ['Waist', r.waist], ['Hip', r.hip], ['Shoulder', r.shoulder], ['Sleeve length', r.sleeveLength], ['Dress length', r.dressLength],
  ];
  return (
    <>
      <PageHeader
        title={`Stitching ${r.number}`}
        subtitle={<span className="flex items-center gap-2"><StitchingBadge status={r.status} /> {formatDateTime(r.createdAt)}</span>}
        back={{ href: '/admin/stitching', label: 'Stitching Requests' }}
        actions={<a href={waLink(`91${wa}`, `Hi ${r.name.split(' ')[0]}, this is ${cfg.businessName} about your stitching request ${r.number}.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-4 py-2.5"><WhatsAppIcon size={16} /> WhatsApp {r.name.split(' ')[0]}</a>}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Customer & Material">
            <dl className="grid gap-4 p-4 text-[14px] sm:grid-cols-3">
              <div><dt className="label">Name</dt><dd>{r.name}</dd></div>
              <div><dt className="label">Phone</dt><dd><a href={`tel:${r.phone}`}>{r.phone}</a></dd></div>
              <div><dt className="label">WhatsApp</dt><dd>{r.whatsapp ?? 'Same as phone'}</dd></div>
              <div className="sm:col-span-3"><dt className="label">Product / material</dt><dd>{r.material ?? '—'}</dd></div>
            </dl>
          </Card>
          <Card title="Measurements (inches)">
            <dl className="grid grid-cols-2 gap-4 p-4 text-[14px] sm:grid-cols-4">
              {measures.map(([k, v]) => <div key={k}><dt className="label">{k}</dt><dd className="text-[16px]">{v || '—'}</dd></div>)}
              {r.otherMeasurements && <div className="col-span-full"><dt className="label">Other</dt><dd>{r.otherMeasurements}</dd></div>}
            </dl>
          </Card>
          <Card title="Design">
            <dl className="grid gap-4 p-4 text-[14px] sm:grid-cols-3">
              <div><dt className="label">Stitching style</dt><dd>{r.stitchingStyle ?? '—'}</dd></div>
              <div><dt className="label">Neck design</dt><dd>{r.neckDesign ?? '—'}</dd></div>
              <div><dt className="label">Sleeve design</dt><dd>{r.sleeveDesign ?? '—'}</dd></div>
              {r.instructions && <div className="sm:col-span-3"><dt className="label">Special instructions</dt><dd className="whitespace-pre-line">{r.instructions}</dd></div>}
            </dl>
          </Card>
          <Card title={`Images (${r.images.length})`}>
            {r.images.length ? (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                {r.images.map((img) => (
                  <a key={img.id} href={`/api/admin/stitching/image/${img.id}`} target="_blank" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/admin/stitching/image/${img.id}`} alt={KIND_LABEL[img.kind]} className="aspect-[4/5] w-full bg-sand object-cover" />
                    <span className="mt-1 block text-[12px] text-muted">{KIND_LABEL[img.kind]}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="p-4 text-muted">No images uploaded.</p>
            )}
          </Card>
        </div>
        <StitchingManage id={r.id} status={r.status} adminNotes={r.adminNotes ?? ''} />
      </div>
    </>
  );
}
