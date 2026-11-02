import 'server-only';
import { prisma, n } from '@/server/db';
import { istDateString } from '@/lib/format';
import type { PurchaseFormValue } from '@/components/admin/purchase-form';

export async function purchaseFormOptions() {
  const [suppliers, categories] = await Promise.all([
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);
  return { suppliers, categories };
}

export const emptyPurchase = (supplierId = ''): PurchaseFormValue => ({
  supplierId,
  supplierContact: '',
  invoiceNumber: '',
  purchaseDate: istDateString(),
  paymentStatus: 'UNPAID',
  discount: '0',
  additionalCharges: '0',
  notes: '',
  items: [],
});

export async function purchaseFormValue(id: string): Promise<PurchaseFormValue | null> {
  const p = await prisma.purchase.findUnique({ where: { id }, include: { items: { include: { variant: true } } } });
  if (!p) return null;
  return {
    id: p.id,
    supplierId: p.supplierId,
    supplierContact: p.supplierContact ?? '',
    invoiceNumber: p.invoiceNumber ?? '',
    purchaseDate: istDateString(p.purchaseDate),
    paymentStatus: p.paymentStatus,
    discount: String(n(p.discount)),
    additionalCharges: String(n(p.additionalCharges)),
    notes: p.notes ?? '',
    items: p.items.map((i) => ({
      key: i.id,
      variantId: i.variantId,
      productName: i.productName,
      sku: i.sku,
      categoryId: i.categoryId ?? '',
      categoryName: i.categoryName ?? '',
      size: i.size,
      color: i.color,
      quantity: String(i.quantity),
      purchasePrice: String(n(i.purchasePrice)),
      sellingPrice: String(n(i.sellingPrice)),
      mrp: i.mrp != null ? String(n(i.mrp)) : '',
      discount: String(n(i.discount)),
      currentStock: i.variant?.stock,
    })),
  };
}
