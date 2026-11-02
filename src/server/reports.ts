import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma, n } from '@/server/db';
import { istRange, round2 } from '@/lib/format';
import { stockStatus } from '@/lib/pricing';

export interface Range {
  from?: string | null;
  to?: string | null;
}

/** A sale is an order whose stock has been taken and that is not cancelled. */
const saleWhere = (start: Date, end: Date): Prisma.OrderWhereInput => ({
  stockState: 'COMMITTED',
  status: { not: 'CANCELLED' },
  createdAt: { gte: start, lt: end },
});

const methodLabel = (o: { channel: string; paymentMethod: string | null }) => o.paymentMethod ?? (o.channel === 'WHATSAPP' ? 'WHATSAPP' : 'UNPAID');

export async function salesReport(r: Range) {
  const { start, end, from, to } = istRange(r.from, r.to);
  const orders = await prisma.order.findMany({ where: saleWhere(start, end), include: { items: true }, orderBy: { createdAt: 'asc' } });
  const rows = orders.flatMap((o) =>
    o.items.map((i) => ({
      date: o.createdAt,
      order: o.number,
      channel: o.channel,
      customer: o.customerName,
      product: i.productName,
      sku: i.sku,
      size: i.size,
      quantity: i.quantity,
      returned: i.returnedQty,
      amount: n(i.total),
      paymentMethod: methodLabel(o),
      cashier: o.cashierName ?? '—',
    })),
  );
  return {
    from,
    to,
    rows,
    totals: {
      orders: orders.length,
      quantity: rows.reduce((s, x) => s + x.quantity, 0),
      amount: round2(rows.reduce((s, x) => s + x.amount, 0)),
      billDiscount: round2(orders.reduce((s, o) => s + n(o.extraDiscount), 0)),
      shipping: round2(orders.reduce((s, o) => s + n(o.shipping), 0)),
      net: round2(orders.reduce((s, o) => s + n(o.total), 0)),
    },
  };
}

export async function purchaseReport(r: Range) {
  const { start, end, from, to } = istRange(r.from, r.to);
  const purchases = await prisma.purchase.findMany({
    where: { status: 'RECEIVED', purchaseDate: { gte: start, lt: end } },
    include: { items: true, supplier: true },
    orderBy: { purchaseDate: 'asc' },
  });
  const rows = purchases.flatMap((p) =>
    p.items.map((i) => ({ date: p.purchaseDate, purchase: p.number, invoice: p.invoiceNumber, supplier: p.supplier.name, product: i.productName, sku: i.sku, quantity: i.quantity, amount: n(i.total) })),
  );
  return {
    from,
    to,
    rows,
    totals: {
      purchases: purchases.length,
      quantity: rows.reduce((s, x) => s + x.quantity, 0),
      amount: round2(rows.reduce((s, x) => s + x.amount, 0)),
      grandTotal: round2(purchases.reduce((s, p) => s + n(p.grandTotal), 0)),
    },
  };
}

/** Opening → movements in the period → closing, per SKU. */
export async function stockReport(r: Range) {
  const { start, end, from, to } = istRange(r.from, r.to);
  const [variants, inRange, after] = await Promise.all([
    prisma.productVariant.findMany({ include: { product: { select: { name: true, category: { select: { name: true } } } } }, orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }] }),
    prisma.stockMovement.groupBy({ by: ['variantId', 'type'], where: { createdAt: { gte: start, lt: end } }, _sum: { quantity: true } }),
    prisma.stockMovement.groupBy({ by: ['variantId'], where: { createdAt: { gte: end } }, _sum: { quantity: true } }),
  ]);
  const afterBy = new Map(after.map((a) => [a.variantId, a._sum.quantity ?? 0]));
  const sums = new Map<string, Record<string, number>>();
  for (const m of inRange) {
    const rec = sums.get(m.variantId) ?? {};
    rec[m.type] = (rec[m.type] ?? 0) + (m._sum.quantity ?? 0);
    sums.set(m.variantId, rec);
  }
  const rows = variants.map((v) => {
    const s = sums.get(v.id) ?? {};
    const closing = v.stock - (afterBy.get(v.id) ?? 0);
    const purchases = s.PURCHASE ?? 0;
    const sales = -((s.SALE ?? 0) + (s.ORDER_CANCELLED ?? 0));
    const returns = s.SALES_RETURN ?? 0;
    const purchaseReturns = -(s.PURCHASE_RETURN ?? 0);
    const adjustments = (s.ADJUSTMENT ?? 0) + (s.EXCEL_IMPORT ?? 0) + (s.OPENING_STOCK ?? 0);
    const opening = closing - purchases + sales - returns + purchaseReturns - adjustments;
    return {
      product: v.product.name,
      category: v.product.category.name,
      sku: v.sku,
      size: v.size,
      color: v.color,
      opening,
      purchases,
      sales,
      returns,
      purchaseReturns,
      adjustments,
      closing,
      current: v.stock,
      stockValue: round2(v.stock * n(v.costPrice)),
    };
  });
  return { from, to, rows, totals: { stockValue: round2(rows.reduce((s, x) => s + x.stockValue, 0)), units: rows.reduce((s, x) => s + x.current, 0) } };
}

export async function profitReport(r: Range) {
  const { start, end, from, to } = istRange(r.from, r.to);
  const orders = await prisma.order.findMany({ where: saleWhere(start, end), include: { items: true } });
  const byProduct = new Map<string, { product: string; quantity: number; sales: number; cost: number }>();
  for (const o of orders) {
    const ratio = n(o.subtotal) > 0 ? (n(o.subtotal) - n(o.extraDiscount)) / n(o.subtotal) : 1;
    for (const i of o.items) {
      const q = i.quantity - i.returnedQty;
      if (q <= 0) continue;
      const rec = byProduct.get(i.productName) ?? { product: i.productName, quantity: 0, sales: 0, cost: 0 };
      rec.quantity += q;
      rec.sales += n(i.price) * q * ratio;
      rec.cost += n(i.costPrice) * q;
      byProduct.set(i.productName, rec);
    }
  }
  const rows = [...byProduct.values()]
    .map((x) => ({ ...x, sales: round2(x.sales), cost: round2(x.cost), profit: round2(x.sales - x.cost), margin: x.sales ? Math.round(((x.sales - x.cost) / x.sales) * 1000) / 10 : 0 }))
    .sort((a, b) => b.profit - a.profit);
  const sales = round2(rows.reduce((s, x) => s + x.sales, 0));
  const cost = round2(rows.reduce((s, x) => s + x.cost, 0));
  return { from, to, rows, totals: { quantity: rows.reduce((s, x) => s + x.quantity, 0), sales, cost, profit: round2(sales - cost) } };
}

const BUCKETS = ['CASH', 'CARD', 'UPI', 'ONLINE', 'WHATSAPP'] as const;
type Bucket = (typeof BUCKETS)[number];
/** WhatsApp/manual orders get their own line whatever they were paid with. */
const bucketOf = (o: { channel: string; paymentMethod: string | null }): Bucket | 'OTHER' =>
  o.channel === 'WHATSAPP' ? 'WHATSAPP' : (BUCKETS as readonly string[]).includes(o.paymentMethod ?? '') ? (o.paymentMethod as Bucket) : 'OTHER';

export async function paymentReport(r: Range) {
  const { start, end, from, to } = istRange(r.from, r.to);
  const [orders, returns] = await Promise.all([
    prisma.order.findMany({ where: { ...saleWhere(start, end), paymentStatus: 'PAID' }, select: { channel: true, paymentMethod: true, total: true } }),
    prisma.salesReturn.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { refundMethod: true, refundAmount: true } }),
  ]);
  const label: Record<string, string> = { CASH: 'Cash', CARD: 'Card', UPI: 'UPI', ONLINE: 'Online Payment', WHATSAPP: 'WhatsApp / manual orders', OTHER: 'Other' };
  const map = new Map<string, { method: string; count: number; amount: number; refunds: number }>();
  for (const k of [...BUCKETS, 'OTHER']) map.set(k, { method: label[k], count: 0, amount: 0, refunds: 0 });
  for (const o of orders) {
    const rec = map.get(bucketOf(o))!;
    rec.count++;
    rec.amount += n(o.total);
  }
  for (const ret of returns) {
    const k = (BUCKETS as readonly string[]).includes(ret.refundMethod) ? ret.refundMethod : 'OTHER';
    map.get(k)!.refunds += n(ret.refundAmount);
  }
  const rows = [...map.values()].filter((x) => x.method !== 'Other' || x.count || x.refunds).map((x) => ({ ...x, amount: round2(x.amount), refunds: round2(x.refunds), net: round2(x.amount - x.refunds) }));
  return { from, to, rows, totals: { count: orders.length, amount: round2(rows.reduce((s, x) => s + x.amount, 0)), refunds: round2(rows.reduce((s, x) => s + x.refunds, 0)) } };
}

export async function cashierReport(r: Range) {
  const { start, end, from, to } = istRange(r.from, r.to);
  const [orders, returns] = await Promise.all([
    prisma.order.findMany({ where: { ...saleWhere(start, end), paymentStatus: 'PAID' }, select: { cashierName: true, channel: true, paymentMethod: true, total: true } }),
    prisma.salesReturn.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { createdByName: true, refundAmount: true } }),
  ]);
  const map = new Map<string, { cashier: string; orders: number; total: number; cash: number; card: number; upi: number; online: number; returns: number }>();
  const get = (name: string) => {
    if (!map.has(name)) map.set(name, { cashier: name, orders: 0, total: 0, cash: 0, card: 0, upi: 0, online: 0, returns: 0 });
    return map.get(name)!;
  };
  for (const o of orders) {
    const rec = get(o.cashierName ?? 'Unassigned');
    const t = n(o.total);
    rec.orders++;
    rec.total += t;
    if (o.paymentMethod === 'CASH') rec.cash += t;
    else if (o.paymentMethod === 'CARD') rec.card += t;
    else if (o.paymentMethod === 'UPI') rec.upi += t;
    else if (o.paymentMethod === 'ONLINE') rec.online += t;
  }
  for (const ret of returns) get(ret.createdByName ?? 'Unassigned').returns += n(ret.refundAmount);
  const rows = [...map.values()].map((x) => ({ ...x, total: round2(x.total), cash: round2(x.cash), card: round2(x.card), upi: round2(x.upi), online: round2(x.online), returns: round2(x.returns) }));
  return { from, to, rows };
}

export async function dailySummary(date?: string | null) {
  const { start, end, from } = istRange(date, date);
  const [orders, returns, newCustomers] = await Promise.all([
    prisma.order.findMany({ where: saleWhere(start, end), include: { items: true } }),
    prisma.salesReturn.findMany({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.customer.count({ where: { createdAt: { gte: start, lt: end } } }),
  ]);
  const by = (m: string) => round2(orders.filter((o) => o.paymentStatus === 'PAID' && o.paymentMethod === m).reduce((s, o) => s + n(o.total), 0));
  let profit = 0;
  for (const o of orders) {
    const ratio = n(o.subtotal) > 0 ? (n(o.subtotal) - n(o.extraDiscount)) / n(o.subtotal) : 1;
    for (const i of o.items) {
      const q = i.quantity - i.returnedQty;
      profit += (n(i.price) * ratio - n(i.costPrice)) * q;
    }
  }
  return {
    date: from,
    sales: round2(orders.reduce((s, o) => s + n(o.total), 0)),
    orders: orders.length,
    itemsSold: orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
    cash: by('CASH'),
    card: by('CARD'),
    upi: by('UPI'),
    online: by('ONLINE'),
    whatsapp: round2(orders.filter((o) => o.channel === 'WHATSAPP').reduce((s, o) => s + n(o.total), 0)),
    returns: round2(returns.reduce((s, x) => s + n(x.refundAmount), 0)),
    returnCount: returns.length,
    grossProfit: round2(profit),
    newCustomers,
  };
}

export async function dashboardStats() {
  const [total, pending, confirmed, completed, revenue, products, variants, stitching, attention] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['PENDING', 'PAYMENT_PENDING'] } } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED'] } } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', status: { not: 'CANCELLED' } }, _sum: { total: true } }),
    prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
    prisma.productVariant.findMany({ where: { isActive: true, product: { status: 'ACTIVE' } }, select: { stock: true, reserved: true, lowStockLevel: true } }),
    prisma.stitchingRequest.count({ where: { status: { in: ['NEW', 'CONTACTED', 'IN_PROGRESS'] } } }),
    prisma.order.count({ where: { needsAttention: { not: null }, status: { not: 'CANCELLED' } } }),
  ]);
  const lowStock = variants.filter((v) => stockStatus(v.stock - v.reserved, v.lowStockLevel) !== 'IN_STOCK').length;
  return { total, pending, confirmed, completed, revenue: n(revenue._sum.total), products, lowStock, stitching, attention };
}
