// Order lifecycle and its effect on stock.
//
//  ONLINE   : created → stock RESERVED, PAYMENT_PENDING → gateway verified
//             server-side → stock COMMITTED, PAID.
//  WHATSAPP : created → stock RESERVED, PENDING → staff confirm → COMMITTED.
//  STORE    : counter sale → stock COMMITTED immediately, DELIVERED.
//  Cancelling gives back the reservation, or restores committed stock.
import 'server-only';
import { randomBytes } from 'node:crypto';
import type { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma, transaction, n, type Tx } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { nextDocNumber } from '@/server/sequence';
import { changeStock, commitReserved, release, reserve, sellAvailable } from '@/server/stock';
import { storeConfig } from '@/server/config';
import { computeTotals } from '@/lib/pricing';
import { round2 } from '@/lib/format';
import type { CheckoutInput } from '@/lib/validators';
import { ORDER_STATUS_LABEL } from '@/lib/constants';

export interface CartLineInput {
  variantId: string;
  quantity: number;
}

/** Merges duplicate lines and loads current prices; throws when anything is unavailable. */
export async function priceCart(lines: CartLineInput[], db: Tx | typeof prisma = prisma) {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);
  const variants = await db.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { select: { id: true, name: true, status: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const problems: { variantId: string; message: string; available: number }[] = [];
  const priced = [...merged].map(([variantId, quantity]) => {
    const v = byId.get(variantId);
    if (!v || !v.isActive || v.product.status !== 'ACTIVE') {
      problems.push({ variantId, message: 'This item is no longer available', available: 0 });
      return null;
    }
    const available = Math.max(v.stock - v.reserved, 0);
    if (available < quantity) {
      problems.push({
        variantId,
        message: available ? `Only ${available} left of ${v.product.name} (${v.size}${v.color ? `, ${v.color}` : ''})` : `${v.product.name} (${v.size}) is out of stock`,
        available,
      });
    }
    return {
      variantId,
      productId: v.product.id,
      productName: v.product.name,
      sku: v.sku,
      size: v.size,
      color: v.color,
      quantity,
      price: n(v.price),
      mrp: n(v.mrp),
      costPrice: n(v.costPrice),
      available,
    };
  });
  return { lines: priced.filter((l): l is NonNullable<typeof l> => !!l), problems };
}

const accessKey = () => randomBytes(18).toString('base64url');

async function upsertCustomer(tx: Tx, c: { name: string; phone: string; whatsapp?: string; email?: string; address?: string; city?: string; state?: string; pincode?: string }) {
  return tx.customer.upsert({
    where: { phone: c.phone },
    update: { name: c.name, whatsapp: c.whatsapp ?? undefined, email: c.email ?? undefined, address: c.address ?? undefined, city: c.city ?? undefined, state: c.state ?? undefined, pincode: c.pincode ?? undefined },
    create: c,
  });
}

function logStatus(tx: Tx, orderId: string, status: OrderStatus, note?: string | null, userName?: string | null) {
  return tx.orderStatusLog.create({ data: { orderId, status, note: note ?? null, userName: userName ?? null } });
}

/** Customer checkout (online payment or WhatsApp). Reserves stock. */
export async function createCustomerOrder(input: CheckoutInput) {
  const cfg = storeConfig();
  await releaseExpiredReservations();
  return transaction(async (tx) => {
    const { lines, problems } = await priceCart(input.lines, tx);
    if (problems.length) throw conflict(problems[0].message, { problems });
    for (const l of lines) {
      if (!(await reserve(tx, l.variantId, l.quantity))) throw conflict(`${l.productName} (${l.size}) just sold out. Please update your cart.`);
    }
    const totals = computeTotals(lines, cfg.shipping);
    const customer = await upsertCustomer(tx, {
      name: input.name,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      address: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
    });
    const online = input.method === 'ONLINE';
    const holdMs = online ? cfg.paymentHoldMinutes * 60_000 : cfg.whatsappHoldHours * 3_600_000;
    const order = await tx.order.create({
      data: {
        number: await nextDocNumber(tx, 'ORDER'),
        accessKey: accessKey(),
        channel: online ? 'ONLINE' : 'WHATSAPP',
        customerId: customer.id,
        customerName: input.name,
        phone: input.phone,
        whatsapp: input.whatsapp ?? input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        deliveryNotes: input.deliveryNotes,
        mrpTotal: totals.mrpTotal,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: online ? 'ONLINE' : null,
        paymentStatus: online ? 'PENDING' : 'UNPAID',
        status: online ? 'PAYMENT_PENDING' : 'PENDING',
        stockState: 'RESERVED',
        reservedUntil: new Date(Date.now() + holdMs),
        cashierName: online ? 'Online' : null,
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            productName: l.productName,
            sku: l.sku,
            size: l.size,
            color: l.color,
            quantity: l.quantity,
            price: l.price,
            mrp: l.mrp,
            costPrice: l.costPrice,
            total: round2(l.price * l.quantity),
          })),
        },
      },
      include: { items: true },
    });
    await logStatus(tx, order.id, order.status, online ? 'Order placed, awaiting payment' : 'Order placed via WhatsApp');
    return order;
  });
}

/** Moves the order's stock from reserved (or, if the hold lapsed, available) to sold. */
async function commitOrderStock(tx: Tx, orderId: string, userName: string | null): Promise<string | null> {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.stockState === 'COMMITTED') return null;
  const short: string[] = [];
  for (const it of order.items) {
    const meta = { reference: order.number, userName };
    if (order.stockState === 'RESERVED') {
      await commitReserved(tx, it.variantId, it.quantity, meta);
    } else if ((await sellAvailable(tx, it.variantId, it.quantity, meta)) == null) {
      short.push(`${it.sku} × ${it.quantity}`);
    }
  }
  if (short.length) throw conflict(`Not enough stock to fulfil this order: ${short.join(', ')}`);
  for (const it of order.items) {
    await tx.$executeRaw`UPDATE products SET "soldCount" = "soldCount" + ${it.quantity} WHERE id = (SELECT "productId" FROM product_variants WHERE id = ${it.variantId})`;
  }
  await tx.order.update({ where: { id: orderId }, data: { stockState: 'COMMITTED', reservedUntil: null } });
  return null;
}

/**
 * Called only after the gateway has confirmed payment server-side. Idempotent:
 * the verify callback and the webhook may both arrive.
 */
export async function markOrderPaid(orderId: string, p: { paymentRowId: string; providerPaymentId: string; method?: string | null }) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    await tx.payment.update({
      where: { id: p.paymentRowId },
      data: { status: 'SUCCESS', providerPaymentId: p.providerPaymentId, method: p.method ?? undefined, verifiedAt: new Date(), errorReason: null },
    });
    if (order.paymentStatus === 'PAID') return order;

    let attention: string | null = null;
    try {
      await commitOrderStock(tx, orderId, 'Online');
    } catch (e) {
      // Payment is real money: record it even if the hold lapsed and stock ran out.
      attention = `Payment received but stock could not be committed (${(e as Error).message}). Refund or restock.`;
    }
    const wasCancelled = order.status === 'CANCELLED';
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE',
        paidAt: new Date(),
        status: 'PAID',
        cancelledAt: null,
        needsAttention: attention ?? (wasCancelled ? 'Payment arrived after the order was cancelled — please review.' : null),
      },
    });
    await logStatus(tx, orderId, 'PAID', `Payment verified (${p.providerPaymentId})`, 'Payment gateway');
    return updated;
  });
}

export async function markPaymentFailed(paymentRowId: string, reason: string | null) {
  await prisma.payment.updateMany({ where: { id: paymentRowId, status: { not: 'SUCCESS' } }, data: { status: 'FAILED', errorReason: reason?.slice(0, 300) ?? null } });
  const pay = await prisma.payment.findUnique({ where: { id: paymentRowId } });
  if (pay) await prisma.order.updateMany({ where: { id: pay.orderId, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
}

/** Re-holds stock for a payment retry whose earlier hold lapsed. */
export async function ensureReservation(orderId: string) {
  const cfg = storeConfig();
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === 'CANCELLED') throw conflict('This order was cancelled. Please place a new order.');
    if (order.paymentStatus === 'PAID') throw conflict('This order is already paid.');
    if (order.stockState === 'RELEASED') {
      for (const it of order.items) {
        if (!(await reserve(tx, it.variantId, it.quantity))) throw conflict(`${it.productName} (${it.size}) is no longer available. Please place a new order.`);
      }
    }
    return tx.order.update({
      where: { id: orderId },
      data: { stockState: 'RESERVED', reservedUntil: new Date(Date.now() + cfg.paymentHoldMinutes * 60_000), paymentStatus: 'PENDING' },
    });
  });
}

/** Gives back holds whose time ran out; abandoned unpaid online orders are cancelled after two days. */
export async function releaseExpiredReservations() {
  const expired = await prisma.order.findMany({
    where: { stockState: 'RESERVED', reservedUntil: { lt: new Date() }, paymentStatus: { not: 'PAID' } },
    select: { id: true },
    take: 200,
  });
  for (const { id } of expired) {
    await transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ stockState: string }[]>`SELECT "stockState" FROM orders WHERE id = ${id} FOR UPDATE`;
      if (rows[0]?.stockState !== 'RESERVED') return;
      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const it of items) await release(tx, it.variantId, it.quantity);
      await tx.order.update({ where: { id }, data: { stockState: 'RELEASED', reservedUntil: null } });
    });
  }
  const stale = await prisma.order.findMany({
    where: { channel: 'ONLINE', status: 'PAYMENT_PENDING', paymentStatus: { not: 'PAID' }, stockState: 'RELEASED', createdAt: { lt: new Date(Date.now() - 48 * 3_600_000) } },
    select: { id: true },
    take: 200,
  });
  for (const { id } of stale) await updateOrderStatus(id, { status: 'CANCELLED', note: 'Payment not completed' }, 'System').catch(() => {});
  return { released: expired.length, cancelled: stale.length };
}

const FLOW: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'];

/** Staff status change. Confirming takes the stock; cancelling gives it back. */
export async function updateOrderStatus(
  orderId: string,
  input: { status: OrderStatus; note?: string; courier?: string; trackingNumber?: string },
  userName: string,
) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw notFound('Order');
    const target = input.status;
    if (order.status === 'CANCELLED') throw conflict('A cancelled order cannot be changed');
    if (target === order.status && !input.courier && !input.trackingNumber && !input.note) return order;
    if (target === 'PAID' || target === 'PAYMENT_PENDING') throw badRequest('Payment status is set by the payment gateway or by recording a payment');
    if (target === 'PENDING' && order.status !== 'PENDING') throw badRequest('An order cannot be moved back to Pending');

    const data: Prisma.OrderUpdateInput = { status: target };
    if (input.courier !== undefined) data.courier = input.courier;
    if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber;

    if (target === 'CANCELLED') {
      if (order.paymentStatus === 'PAID' && order.channel === 'ONLINE' && !input.note) {
        throw badRequest('This order was paid online. Add a note on how the refund will be made before cancelling.');
      }
      if (order.stockState === 'RESERVED') {
        for (const it of order.items) await release(tx, it.variantId, it.quantity);
      } else if (order.stockState === 'COMMITTED') {
        for (const it of order.items) {
          const back = it.quantity - it.returnedQty;
          if (back > 0) await changeStock(tx, it.variantId, back, { type: 'ORDER_CANCELLED', reference: order.number, note: input.note, userName });
        }
      }
      data.stockState = 'RELEASED';
      data.reservedUntil = null;
      data.cancelledAt = new Date();
    } else if (FLOW.includes(target)) {
      if (order.channel === 'ONLINE' && order.paymentStatus !== 'PAID') {
        throw badRequest('Online payment is not verified for this order. Record a payment first or cancel it.');
      }
      await commitOrderStock(tx, orderId, userName);
      if (!order.confirmedAt) {
        data.confirmedAt = new Date();
        if (!order.cashierName) data.cashierName = userName;
      }
    }
    const updated = await tx.order.update({ where: { id: orderId }, data });
    await logStatus(tx, orderId, target, input.note ?? (target !== order.status ? `Status → ${ORDER_STATUS_LABEL[target]}` : 'Details updated'), userName);
    return updated;
  });
}

/** Staff records a payment collected outside the gateway (WhatsApp orders). */
export async function recordManualPayment(orderId: string, method: PaymentMethod, reference: string | undefined, userName: string) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw notFound('Order');
    if (order.status === 'CANCELLED') throw conflict('This order is cancelled');
    if (order.paymentStatus === 'PAID') throw conflict('This order is already marked as paid');
    await commitOrderStock(tx, orderId, userName);
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: method,
        paidAt: new Date(),
        status: order.status === 'PENDING' || order.status === 'PAYMENT_PENDING' ? 'CONFIRMED' : order.status,
        confirmedAt: order.confirmedAt ?? new Date(),
        cashierName: order.cashierName && order.cashierName !== 'Online' ? order.cashierName : userName,
      },
    });
    await logStatus(tx, orderId, updated.status, `Payment recorded: ${method}${reference ? ` (${reference})` : ''}`, userName);
    return updated;
  });
}

/** Counter sale by the cashier: paid and handed over immediately. */
export async function createStoreSale(
  input: { customerName?: string; phone?: string; paymentMethod: 'CASH' | 'CARD' | 'UPI'; extraDiscount: number; lines: CartLineInput[] },
  cashier: string,
) {
  return transaction(async (tx) => {
    const { lines, problems } = await priceCart(input.lines, tx);
    if (problems.length) throw conflict(problems[0].message, { problems });
    const totals = computeTotals(lines, { flat: 0, freeAbove: 0 }, input.extraDiscount);
    const customer = input.phone ? await upsertCustomer(tx, { name: input.customerName || 'Walk-in customer', phone: input.phone }) : null;
    const number = await nextDocNumber(tx, 'ORDER');
    for (const l of lines) {
      if ((await sellAvailable(tx, l.variantId, l.quantity, { reference: number, userName: cashier })) == null) {
        throw conflict(`${l.productName} (${l.size}) is out of stock`);
      }
      await tx.product.update({ where: { id: l.productId }, data: { soldCount: { increment: l.quantity } } });
    }
    const now = new Date();
    const order = await tx.order.create({
      data: {
        number,
        accessKey: accessKey(),
        channel: 'STORE',
        customerId: customer?.id,
        customerName: input.customerName || customer?.name || 'Walk-in customer',
        phone: input.phone || '',
        mrpTotal: totals.mrpTotal,
        subtotal: totals.subtotal,
        extraDiscount: round2(totals.discount - (totals.mrpTotal - totals.subtotal)),
        shipping: 0,
        total: totals.total,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'PAID',
        status: 'DELIVERED',
        stockState: 'COMMITTED',
        cashierName: cashier,
        paidAt: now,
        confirmedAt: now,
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            productName: l.productName,
            sku: l.sku,
            size: l.size,
            color: l.color,
            quantity: l.quantity,
            price: l.price,
            mrp: l.mrp,
            costPrice: l.costPrice,
            total: round2(l.price * l.quantity),
          })),
        },
      },
    });
    await logStatus(tx, order.id, 'DELIVERED', 'Counter sale', cashier);
    return order;
  });
}

/** Returned items go back into stock (unless marked damaged) and are recorded as Sales Return. */
export async function createSalesReturn(
  input: { orderId: string; reason?: string; refundMethod: PaymentMethod; items: { orderItemId: string; quantity: number; restock: boolean }[] },
  userName: string,
) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${input.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { items: true } });
    if (!order) throw notFound('Order');
    if (order.stockState !== 'COMMITTED' || order.status === 'CANCELLED') throw conflict('Only completed sales can be returned');
    const number = await nextDocNumber(tx, 'SALES_RETURN');
    // Spread any bill discount across lines so refunds never exceed what was paid.
    const ratio = n(order.subtotal) > 0 ? (n(order.subtotal) - n(order.extraDiscount)) / n(order.subtotal) : 1;
    let refund = 0;
    const rows: { orderItemId: string; quantity: number; amount: number; restocked: boolean }[] = [];
    for (const r of input.items) {
      const it = order.items.find((i) => i.id === r.orderItemId);
      if (!it) throw badRequest('Item does not belong to this order');
      if (r.quantity > it.quantity - it.returnedQty) throw badRequest(`Only ${it.quantity - it.returnedQty} of ${it.sku} can be returned`);
      const amount = round2(n(it.price) * r.quantity * ratio);
      refund += amount;
      rows.push({ orderItemId: it.id, quantity: r.quantity, amount, restocked: r.restock });
      await tx.orderItem.update({ where: { id: it.id }, data: { returnedQty: { increment: r.quantity } } });
      if (r.restock) await changeStock(tx, it.variantId, r.quantity, { type: 'SALES_RETURN', reference: number, note: input.reason, userName });
    }
    return tx.salesReturn.create({
      data: { number, orderId: order.id, reason: input.reason, refundMethod: input.refundMethod, refundAmount: round2(refund), createdByName: userName, items: { create: rows } },
    });
  });
}

/** Public lookup used by the confirmation and tracking pages. */
export async function findOrderForCustomer(number: string, key: { accessKey?: string; phone?: string }) {
  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: { include: { variant: { select: { product: { select: { slug: true, category: { select: { slug: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' } } } } } } } }, statusHistory: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) return null;
  const ok = (key.accessKey && key.accessKey === order.accessKey) || (key.phone && key.phone === order.phone);
  return ok ? order : null;
}
