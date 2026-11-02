import { adminApi } from '@/server/http';
import { badRequest } from '@/server/errors';
import { savePublicImage } from '@/server/storage';

/** Product / category photo upload → WebP on disk, returns its public URL. */
export const POST = adminApi('ADMIN', async ({ req }) => {
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll('file') ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) throw badRequest('Choose an image to upload');
  if (files.length > 10) throw badRequest('Upload at most 10 images at a time');
  const folder = form?.get('folder') === 'categories' ? 'categories' : 'products';
  const urls: string[] = [];
  for (const f of files) urls.push(await savePublicImage(f, folder));
  return { urls };
});
