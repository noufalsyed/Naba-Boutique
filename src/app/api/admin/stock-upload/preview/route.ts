import { adminApi } from '@/server/http';
import { readUpload } from '@/server/excel-upload';
import { previewImport } from '@/server/excel';

/** Validates the file and reports what would change. Writes nothing. */
export const POST = adminApi('ADMIN', async ({ req }) => {
  const { buffer, mode, stockAction } = await readUpload(req);
  return previewImport(buffer, mode, stockAction);
});
