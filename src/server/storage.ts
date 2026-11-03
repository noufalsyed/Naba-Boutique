// File storage for uploaded images. Two backends behind one interface:
//  • disk    — <STORAGE_DIR> on a VPS (local development, Oracle / Google Cloud VM).
//  • netlify — Netlify Blobs, for the serverless Netlify deployment, where the
//              function file system is read-only and not shared between instances.
// Public product photos live under "public/" and are served at /media/...;
// customer stitching uploads live under "private/" and are served only to staff.
import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { badRequest } from '@/server/errors';
import { onNetlify } from '@/server/platform';

export const storageRoot = () => path.resolve(process.env.STORAGE_DIR || './storage');
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

interface Backend {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
}

/** Resolves a stored path inside a root, refusing traversal. */
export function safeResolve(root: string, rel: string) {
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root) + path.sep)) return null;
  return full;
}

/** Keys are plain "a/b/c.webp" paths: no "..", ".", empty parts or backslashes. */
const validKey = (key: string) => !key.includes('\\') && key.split('/').every((p) => p !== '' && p !== '.' && p !== '..');

const disk: Backend = {
  async put(key, data) {
    const file = safeResolve(storageRoot(), key);
    if (!file) throw new Error(`Invalid storage key ${key}`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  },
  async get(key) {
    const file = safeResolve(storageRoot(), key);
    if (!file) return null;
    return fs.readFile(file).catch(() => null);
  },
};

// Inside Netlify functions the store needs no settings. NETLIFY_SITE_ID +
// NETLIFY_AUTH_TOKEN let a script on your PC (the demo seed) write to it;
// NETLIFY_BLOBS_EDGE_URL points at a local test server.
async function blobStore() {
  const { getStore } = await import('@netlify/blobs');
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  const edgeURL = process.env.NETLIFY_BLOBS_EDGE_URL;
  return siteID && token ? getStore({ name: 'media', consistency: 'strong', siteID, token, ...(edgeURL ? { edgeURL, uncachedEdgeURL: edgeURL } : {}) }) : getStore({ name: 'media', consistency: 'strong' });
}

const blobs: Backend = {
  async put(key, data) {
    await (await blobStore()).set(key, new Uint8Array(data).buffer);
  },
  async get(key) {
    const data = await (await blobStore()).get(key, { type: 'arrayBuffer' });
    return data ? Buffer.from(data) : null;
  },
};

const backend = (): Backend => ((process.env.STORAGE_DRIVER || (onNetlify ? 'netlify' : 'disk')) === 'netlify' ? blobs : disk);

/** Reads a stored file by key, e.g. "public/products/x.webp"; null when missing or invalid. */
export const readStored = async (key: string) => (validKey(key) ? backend().get(key) : null);

/** Stores an already-encoded public image (used by the demo seed) and returns its URL. */
export async function putPublicFile(folder: 'products' | 'categories', fileName: string, data: Buffer) {
  if (!validKey(fileName)) throw new Error(`Invalid file name ${fileName}`);
  await backend().put(`public/${folder}/${fileName}`, data);
  return `/media/${folder}/${fileName}`;
}

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
  return putPublicFile(folder, name(), await toWebp(file, 1600));
}

/** Returns the key relative to private/, as stored on StitchingImage.path. */
export async function savePrivateImage(file: File, folder: 'stitching') {
  const rel = `${folder}/${name()}`;
  await backend().put(`private/${rel}`, await toWebp(file, 2000));
  return rel;
}
