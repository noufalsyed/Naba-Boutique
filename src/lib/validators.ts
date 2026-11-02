import { z } from 'zod';
import { ADJUSTMENT_TYPES, ORDER_STATUSES } from '@/lib/constants';

/** Trims, strips control characters and angle brackets, collapses blanks to undefined. */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[<>]/g, '').trim();
export const text = (max = 200) => z.string().max(max * 2).transform(clean).pipe(z.string().max(max));
export const reqText = (label: string, max = 200) =>
  z.string({ required_error: `${label} is required` }).max(max * 2).transform(clean).pipe(z.string().min(1, `${label} is required`).max(max));
export const optText = (max = 500) =>
  z
    .string()
    .max(max * 2)
    .optional()
    .nullable()
    .transform((s) => (s == null ? undefined : clean(s) || undefined))
    .pipe(z.string().max(max).optional());

/** Indian mobile: 10 digits, optional +91 / 0 prefix. Normalised to 10 digits. */
export const phone = (label = 'Mobile number') =>
  z
    .string({ required_error: `${label} is required` })
    .transform((s) => s.replace(/[\s\-()]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, ''))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, `Enter a valid 10-digit ${label.toLowerCase()}`));
export const optPhone = (label = 'WhatsApp number') =>
  z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s ? s.replace(/[\s\-()]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '') : undefined))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, `Enter a valid 10-digit ${label.toLowerCase()}`).optional());

export const email = z.string().trim().toLowerCase().max(200).email('Enter a valid email address');
export const optEmail = z
  .string()
  .optional()
  .nullable()
  .transform((s) => (s ? s.trim().toLowerCase() : undefined))
  .pipe(z.string().email('Enter a valid email address').max(200).optional());

export const money = z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).min(0, 'Amount cannot be negative').max(10_000_000).transform((v) => Math.round(v * 100) / 100);
export const qty = z.coerce.number({ invalid_type_error: 'Enter a valid quantity' }).int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(1000);
export const id = z.string().min(1).max(40);

export const cartLines = z
  .array(z.object({ variantId: id, quantity: qty }))
  .min(1, 'Your cart is empty')
  .max(50);

export const checkoutSchema = z.object({
  name: reqText('Full name', 100),
  phone: phone('Mobile number'),
  whatsapp: optPhone('WhatsApp number'),
  email: optEmail,
  address: reqText('Address', 400),
  city: reqText('City', 80),
  state: reqText('State', 80),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  deliveryNotes: optText(400),
  method: z.enum(['ONLINE', 'WHATSAPP']),
  lines: cartLines,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const stitchingFields = z.object({
  name: reqText('Name', 100),
  phone: phone('Phone number'),
  whatsapp: optPhone('WhatsApp number'),
  material: optText(200),
  size: optText(40),
  bust: optText(20),
  waist: optText(20),
  hip: optText(20),
  shoulder: optText(20),
  sleeveLength: optText(20),
  dressLength: optText(20),
  otherMeasurements: optText(500),
  stitchingStyle: optText(100),
  neckDesign: optText(100),
  sleeveDesign: optText(100),
  instructions: optText(1500),
});

// ───────────── Admin ─────────────

export const variantInput = z.object({
  id: id.optional(),
  sku: z.string().trim().toUpperCase().max(40).optional().transform((s) => s || undefined),
  size: reqText('Size', 30),
  color: text(40).default(''),
  price: money,
  mrp: money,
  costPrice: money.default(0),
  lowStockLevel: z.coerce.number().int().min(0).max(10000).default(3),
  openingStock: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const productInput = z.object({
  name: reqText('Product name', 150),
  slug: z.string().trim().toLowerCase().max(90).regex(/^[a-z0-9-]*$/, 'Slug may contain only letters, numbers and dashes').optional(),
  categoryId: id,
  subcategory: optText(80),
  shortDesc: optText(200),
  description: optText(4000),
  fabric: optText(120),
  careNotes: optText(400),
  supplierId: id.optional().nullable(),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
  images: z.array(z.object({ url: z.string().max(400).regex(/^\/media\/[\w\-/.]+$|^https:\/\/[^\s"'<>]+$/, 'Invalid image address'), alt: optText(150) })).max(10).default([]),
  variants: z.array(variantInput).min(1, 'Add at least one size / colour').max(60),
});
export type ProductInput = z.infer<typeof productInput>;

export const categoryInput = z.object({
  name: reqText('Category name', 80),
  slug: z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9-]*$/).optional(),
  description: optText(400),
  imageUrl: optText(400),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const supplierInput = z.object({
  name: reqText('Supplier name', 120),
  companyName: optText(150),
  phone: optText(20),
  whatsapp: optText(20),
  email: optEmail,
  address: optText(400),
  gstin: z.string().trim().toUpperCase().max(20).optional().transform((s) => s || undefined),
  notes: optText(500),
  isActive: z.boolean().default(true),
});

export const purchaseItemInput = z.object({
  variantId: id.optional().nullable(),
  productName: reqText('Product', 150),
  sku: z.string().trim().toUpperCase().max(40).optional().transform((s) => s || undefined),
  categoryId: id.optional().nullable(),
  size: text(30).default('Free Size').transform((s) => s || 'Free Size'),
  color: text(40).default(''),
  quantity: qty.pipe(z.number().max(100000)),
  purchasePrice: money,
  sellingPrice: money,
  mrp: money.optional().nullable(),
  discount: money.default(0),
});

export const purchaseInput = z.object({
  supplierId: id,
  supplierContact: optText(60),
  invoiceNumber: optText(60),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a purchase date'),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).default('UNPAID'),
  discount: money.default(0),
  additionalCharges: money.default(0),
  notes: optText(500),
  items: z.array(purchaseItemInput).min(1, 'Add at least one product').max(200),
  receive: z.boolean().default(false),
});
export type PurchaseInput = z.infer<typeof purchaseInput>;

export const adjustmentInput = z.object({
  variantId: id,
  type: z.enum(ADJUSTMENT_TYPES),
  /** Units for add/remove types; signed change for Correction; the counted stock for Physical Count. */
  quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).int('Quantity must be a whole number').min(-100000).max(100000),
  reason: reqText('Reason', 300),
});

export const orderStatusInput = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optText(300),
  courier: optText(80),
  trackingNumber: optText(80),
});

export const manualPaymentInput = z.object({
  method: z.enum(['UPI', 'CARD', 'CASH', 'BANK_TRANSFER', 'OTHER']),
  reference: optText(100),
});

export const storeSaleInput = z.object({
  customerName: optText(100),
  phone: optPhone('Phone number'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI']),
  extraDiscount: money.default(0),
  lines: cartLines,
});

export const salesReturnInput = z.object({
  orderId: id,
  reason: optText(300),
  refundMethod: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'OTHER']),
  items: z.array(z.object({ orderItemId: id, quantity: qty, restock: z.boolean().default(true) })).min(1, 'Choose at least one item to return'),
});

export const purchaseReturnInput = z.object({
  reason: optText(300),
  items: z.array(z.object({ purchaseItemId: id, quantity: qty })).min(1, 'Choose at least one item to return'),
});

export const staffInput = z.object({
  name: reqText('Name', 100),
  email,
  role: z.enum(['ADMIN', 'CASHIER']),
  password: z.string().max(200).optional(),
  isActive: z.boolean().default(true),
});
