// Storage backends: disk (VPS / local) and Netlify Blobs, the latter against
// the local Blobs test server that ships with @netlify/blobs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { BlobsServer } from '@netlify/blobs/server';
import { putPublicFile, readStored, savePrivateImage, savePublicImage } from '@/server/storage';

let tmp = '';
before(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'naba-storage-'));
});
after(() => fs.rm(tmp, { recursive: true, force: true }));
const photo = async () => new File([new Uint8Array(await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#7a2235' } }).jpeg().toBuffer())], 'p.jpg', { type: 'image/jpeg' });

async function roundTrip() {
  const url = await savePublicImage(await photo(), 'products');
  assert.match(url, /^\/media\/products\/[a-z0-9]+-[0-9a-f]{12}\.webp$/);
  const pub = await readStored(`public/${url.slice('/media/'.length)}`);
  assert.ok(pub, 'public photo can be read back');
  const meta = await sharp(pub).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(Math.max(meta.width!, meta.height!), 1600, 'resized to 1600 px');

  const rel = await savePrivateImage(await photo(), 'stitching');
  assert.ok(await readStored(`private/${rel}`), 'private photo can be read back');
  for (const bad of [`public/../private/${rel}`, `public/./x.webp`, `public//x.webp`, `public\\..\\private\\${rel}`]) {
    assert.equal(await readStored(bad), null, `refused: ${bad}`);
  }
  assert.equal(await readStored('public/products/missing.webp'), null);
  await assert.rejects(putPublicFile('products', '../escape.webp', Buffer.from('x')));
}

test('disk storage round trip and path safety', async () => {
  process.env.STORAGE_DRIVER = 'disk';
  process.env.STORAGE_DIR = path.join(tmp, 'disk');
  await roundTrip();
  const files = await fs.readdir(path.join(tmp, 'disk', 'public', 'products'));
  assert.equal(files.length, 1);
});

test('Netlify Blobs storage round trip and path safety', async () => {
  const server = new BlobsServer({ directory: path.join(tmp, 'blobs'), token: 'test-token' });
  const { port } = await server.start();
  try {
    Object.assign(process.env, {
      STORAGE_DRIVER: 'netlify',
      NETLIFY_SITE_ID: 'test-site',
      NETLIFY_AUTH_TOKEN: 'test-token',
      NETLIFY_BLOBS_EDGE_URL: `http://localhost:${port}`,
    });
    await roundTrip();
    const written = await fs.readdir(path.join(tmp, 'blobs'), { recursive: true });
    assert.ok(written.some((f) => f.endsWith('.webp')), 'files went to the Blobs server, not to disk');
  } finally {
    await server.stop();
    for (const k of ['STORAGE_DRIVER', 'NETLIFY_SITE_ID', 'NETLIFY_AUTH_TOKEN', 'NETLIFY_BLOBS_EDGE_URL']) delete process.env[k];
  }
});
