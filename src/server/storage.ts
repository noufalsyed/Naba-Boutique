// Local-disk file storage (the Oracle VPS block volume). Public product photos
// live under <STORAGE_DIR>/public and are served at /media/...; customer
// stitching uploads live under <STORAGE_DIR>/private and are served only to staff.
import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { badRequest } from '@/server/errors';

export const storageRoot = () => path.resolve(process.env.STORAGE_DIR || './storage');
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

/** Re-encodes an uploaded image to WebP (this also strips EXIF/location data). */
async function toWebp(file: File, maxSide: number) {
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest('Each image must be 6 MB or smaller');
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const meta = await sharp(buf).metadata();
    if (!meta.format || !['jpeg', 'png', 'webp', 'avif', 'heif', 'gif'].includes(meta.format)) throw new Error('format');
    return await sharp(buf, { animated: false }).rotate().resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw badRequest('Upload a JPG, PNG, WebP or HEIC image');
  }
}

const name = () => `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.webp`;

export async function savePublicImage(file: File, folder: 'products' | 'categories') {
  const out = await toWebp(file, 1600);
  const dir = path.join(storageRoot(), 'public', folder);
  await fs.mkdir(dir, { recursive: true });
  const file_ = name();
  await fs.writeFile(path.join(dir, file_), out);
  return `/media/${folder}/${file_}`;
}

export async function savePrivateImage(file: File, folder: 'stitching') {
  const out = await toWebp(file, 2000);
  const dir = path.join(storageRoot(), 'private', folder);
  await fs.mkdir(dir, { recursive: true });
  const file_ = name();
  await fs.writeFile(path.join(dir, file_), out);
  return `${folder}/${file_}`;
}

/** Resolves a stored path inside a root, refusing traversal. */
export function safeResolve(root: string, rel: string) {
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root) + path.sep)) return null;
  return full;
}
