export const BRAND = 'NABA Boutique';
export const BRAND_SHORT = 'NABA';
/** The boutique's signature line. */
export const BRAND_QUOTE = 'Feathers – The 2nd Skin';
export const TAGLINE = 'Your Style. Your Fit. Your Second Skin.';

export const ORDER_STATUSES = [
  'PENDING',
  'PAYMENT_PENDING',
  'PAID',
  'CONFIRMED',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatusKey = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatusKey, string> = {
  PENDING: 'Pending',
  PAYMENT_PENDING: 'Payment Pending',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_TO_SHIP: 'Ready to Ship',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Unpaid',
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  ONLINE: 'Online Payment',
  UPI: 'UPI',
  CARD: 'Card',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

export const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  WHATSAPP: 'WhatsApp',
  STORE: 'Store',
};

export const MOVEMENT_LABEL: Record<string, string> = {
  OPENING_STOCK: 'Opening Stock',
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  SALES_RETURN: 'Sales Return',
  PURCHASE_RETURN: 'Purchase Return',
  ADJUSTMENT: 'Stock Adjustment',
  EXCEL_IMPORT: 'Excel Import',
  ORDER_CANCELLED: 'Order Cancelled',
};

export const ADJUSTMENT_TYPES = ['ADD', 'REMOVE', 'DAMAGED', 'LOST', 'CORRECTION', 'PHYSICAL_COUNT'] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];
export const ADJUSTMENT_LABEL: Record<AdjustmentType, string> = {
  ADD: 'Add Stock',
  REMOVE: 'Remove Stock',
  DAMAGED: 'Damaged',
  LOST: 'Lost',
  CORRECTION: 'Correction',
  PHYSICAL_COUNT: 'Physical Stock Count',
};

export const STITCHING_STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'Free Size'];
export const sortSizes = (sizes: string[]) =>
  [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });

export const INDIAN_STATES = [
  'Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Goa', 'Gujarat', 'Delhi',
  'Rajasthan', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Uttarakhand', 'Himachal Pradesh', 'Jammu and Kashmir', 'Ladakh',
  'Madhya Pradesh', 'Chhattisgarh', 'Bihar', 'Jharkhand', 'Odisha', 'West Bengal', 'Assam', 'Sikkim', 'Meghalaya',
  'Arunachal Pradesh', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura', 'Puducherry', 'Chandigarh', 'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
];

/** Colour name → swatch. Unknown names fall back to a neutral swatch. */
export const COLOR_SWATCH: Record<string, string> = {
  ivory: '#f4ecdc', cream: '#efe3c8', beige: '#d9c3a5', white: '#f8f6f2', black: '#1f1d1c', grey: '#9a9692',
  maroon: '#6d1f2c', burgundy: '#7a2235', wine: '#5e1a2a', red: '#b3263a', rose: '#c98d95', pink: '#e2a3b0',
  peach: '#efb79b', coral: '#e4775f', orange: '#d9772e', mustard: '#c99a2e', yellow: '#e2c14b', gold: '#c5a35a',
  green: '#4f7a52', olive: '#77783f', mint: '#a9cdb5', teal: '#2f6f73', blue: '#3c5f93', navy: '#22304f',
  'sky blue': '#8fb6d9', lavender: '#b3a4cf', purple: '#6b4a86', mauve: '#a07b8f', brown: '#7a5235', multicolor: 'conic-gradient(#c98d95,#c5a35a,#4f7a52,#3c5f93,#c98d95)',
};
export const swatchFor = (color: string) => COLOR_SWATCH[color.trim().toLowerCase()] ?? '#cbbfb3';
