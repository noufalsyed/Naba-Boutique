import 'server-only';
import { badRequest } from '@/server/errors';
import type { ImportMode, StockAction } from '@/server/excel';

/** Reads the multipart upload shared by preview and confirm. */
export async function readUpload(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !file.size) throw badRequest('Choose an .xlsx file');
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw badRequest('Only .xlsx files are supported. In Excel use File → Save As → Excel Workbook (.xlsx).');
  if (file.size > 5 * 1024 * 1024) throw badRequest('The file is larger than 5 MB');
  const mode: ImportMode = form?.get('mode') === 'UPDATE' ? 'UPDATE' : 'NEW';
  const stockAction: StockAction = form?.get('stockAction') === 'REPLACE' ? 'REPLACE' : 'ADD';
  return { buffer: Buffer.from(await file.arrayBuffer()), mode, stockAction };
}
