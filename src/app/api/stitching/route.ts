import { publicApi } from '@/server/http';
import { badRequest, tooMany } from '@/server/errors';
import { rateLimit } from '@/server/rate-limit';
import { transaction } from '@/server/db';
import { nextDocNumber } from '@/server/sequence';
import { savePrivateImage } from '@/server/storage';
import { stitchingFields } from '@/lib/validators';

const KINDS = { reference: 'REFERENCE', material: 'MATERIAL', inspiration: 'INSPIRATION' } as const;

export const POST = publicApi(async ({ req, ip }) => {
  if (!(await rateLimit(`stitch:${ip}`, 6, 30 * 60_000)).ok) throw tooMany('Too many requests. Please message us on WhatsApp instead.');
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 25 * 1024 * 1024) throw badRequest('Uploads are too large. Use up to 3 images per type, 6 MB each.');
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest('Invalid form');
  }
  const fields = stitchingFields.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
  const files: { kind: (typeof KINDS)[keyof typeof KINDS]; file: File }[] = [];
  for (const [field, kind] of Object.entries(KINDS)) {
    const list = form.getAll(field).filter((v): v is File => v instanceof File && v.size > 0);
    if (list.length > 3) throw badRequest('Upload at most 3 images of each type');
    files.push(...list.map((file) => ({ kind, file })));
  }
  const paths: { kind: (typeof KINDS)[keyof typeof KINDS]; path: string }[] = [];
  for (const f of files) paths.push({ kind: f.kind, path: await savePrivateImage(f.file, 'stitching') });

  const created = await transaction(async (tx) =>
    tx.stitchingRequest.create({ data: { ...fields, number: await nextDocNumber(tx, 'STITCHING'), images: { create: paths } } }),
  );
  return { number: created.number };
});
