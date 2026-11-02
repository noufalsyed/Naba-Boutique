import { PageHeader } from '@/components/admin/ui';
import { StockUpload } from '@/components/admin/stock-upload';
import { requireAdmin } from '@/server/auth/guard';

export const metadata = { title: 'Stock Upload – Excel' };

export default async function StockUploadPage() {
  await requireAdmin('ADMIN');
  return (
    <>
      <PageHeader title="Stock Upload – Excel" subtitle="Import new products or update stock in bulk. Nothing is saved until you confirm the preview." />
      <StockUpload />
    </>
  );
}
