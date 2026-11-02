import { round2 } from '@/lib/format';

/** Whole-number discount percentage of price against MRP, or 0. */
export function discountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export interface ShippingRules {
  flat: number;
  freeAbove: number;
}

export function shippingFor(subtotal: number, rules: ShippingRules): number {
  if (subtotal <= 0) return 0;
  return rules.freeAbove > 0 && subtotal >= rules.freeAbove ? 0 : rules.flat;
}

export interface PricedLine {
  price: number;
  mrp: number;
  quantity: number;
}

export interface Totals {
  mrpTotal: number;
  subtotal: number;
  /** Savings against MRP. */
  discount: number;
  shipping: number;
  /** Prices are GST inclusive, so no tax is added on top. */
  tax: number;
  total: number;
  itemCount: number;
}

export function computeTotals(lines: PricedLine[], rules: ShippingRules, extraDiscount = 0): Totals {
  let mrpTotal = 0;
  let subtotal = 0;
  let itemCount = 0;
  for (const l of lines) {
    mrpTotal += Math.max(l.mrp, l.price) * l.quantity;
    subtotal += l.price * l.quantity;
    itemCount += l.quantity;
  }
  const extra = Math.min(Math.max(extraDiscount, 0), subtotal);
  const shipping = shippingFor(subtotal - extra, rules);
  return {
    mrpTotal: round2(mrpTotal),
    subtotal: round2(subtotal),
    discount: round2(mrpTotal - subtotal + extra),
    shipping,
    tax: 0,
    total: round2(subtotal - extra + shipping),
    itemCount,
  };
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function stockStatus(available: number, lowStockLevel: number): StockStatus {
  if (available <= 0) return 'OUT_OF_STOCK';
  if (available <= lowStockLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
};
