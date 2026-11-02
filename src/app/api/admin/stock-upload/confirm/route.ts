import { adminApi } from '@/server/http';
import { readUpload } from '@/server/excel-upload';
import { confirmImport } from '@/server/excel';

export const POST = adminApi('ADMIN', async ({ req, admin }) => {
  const { buffer, mode, stockAction } = await readUpload(req);
  return confirmImport(buffer, mode, stockAction, admin.name);
});
