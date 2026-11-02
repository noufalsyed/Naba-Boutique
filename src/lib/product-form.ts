// Product form shapes and defaults, shared by the admin form (client) and its pages (server).

export interface VariantRow {
  id?: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  mrp: string;
  costPrice: string;
  lowStockLevel: string;
  openingStock: string;
  isActive: boolean;
  stock?: number;
}

export interface ProductFormValue {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  subcategory: string;
  shortDesc: string;
  description: string;
  fabric: string;
  careNotes: string;
  supplierId: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  images: { url: string; alt: string }[];
  variants: VariantRow[];
}

export const blankVariant = (base?: Partial<VariantRow>): VariantRow => ({ sku: '', size: 'Free Size', color: '', price: '', mrp: '', costPrice: '', lowStockLevel: '3', openingStock: '0', isActive: true, ...base });

export const emptyProduct = (categoryId = ''): ProductFormValue => ({
  name: '', slug: '', categoryId, subcategory: '', shortDesc: '', description: '', fabric: '', careNotes: 'Gentle hand wash or dry clean. Dry in shade.', supplierId: '',
  isFeatured: false, isNewArrival: true, isBestSeller: false, status: 'ACTIVE', images: [], variants: [blankVariant()],
});
