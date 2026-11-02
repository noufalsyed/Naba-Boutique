// The only place variant stock changes. Every change is a single conditional
// UPDATE (so concurrent buyers cannot oversell) followed by a StockMovement
// row recording previous and new stock.
import 'server-only';
import type { MovementType } from '@prisma/client';
import type { Tx } from '@/server/db';
import { conflict, notFound } from '@/server/errors';

export interface MovementMeta {
  type: MovementType;
  reference?: string | null;
  note?: string | null;
  userName?: string | null;
}

async function record(tx: Tx, variantId: string, quantity: number, newStock: number, meta: MovementMeta) {
  await tx.stockMovement.create({
    data: {
      variantId,
      type: meta.type,
      quantity,
      previousStock: newStock - quantity,
      newStock,
      reference: meta.reference ?? null,
      note: meta.note ?? null,
      userName: meta.userName ?? null,
    },
  });
  return newStock;
}

async function skuOf(tx: Tx, variantId: string) {
  const v = await tx.productVariant.findUnique({ where: { id: variantId }, select: { sku: true, stock: true, reserved: true } });
  if (!v) throw notFound('Product variant');
  return v;
}

/**
 * Adds `delta` (positive or negative) to stock. A decrease may not take stock
 * below zero, nor below what is reserved for pending orders.
 */
export async function changeStock(tx: Tx, variantId: string, delta: number, meta: MovementMeta): Promise<number> {
  if (!Number.isInteger(delta) || delta === 0) throw conflict('Quantity must be a whole number other than zero');
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    UPDATE product_variants SET stock = stock + ${delta}, "updatedAt" = now()
    WHERE id = ${variantId} AND stock + ${delta} >= 0 AND (${delta} > 0 OR stock - reserved + ${delta} >= 0)
    RETURNING stock`;
  if (!rows.length) {
    const v = await skuOf(tx, variantId);
    throw conflict(`Not enough stock for ${v.sku}: ${v.stock} in stock, ${v.reserved} reserved`);
  }
  return record(tx, variantId, delta, rows[0].stock, meta);
}

/** Sets stock to an exact count (physical count / replace import). */
export async function setStock(tx: Tx, variantId: string, newStock: number, meta: MovementMeta): Promise<number> {
  if (!Number.isInteger(newStock) || newStock < 0) throw conflict('Stock must be a whole number, zero or more');
  const rows = await tx.$queryRaw<{ stock: number; reserved: number }[]>`
    SELECT stock, reserved FROM product_variants WHERE id = ${variantId} FOR UPDATE`;
  if (!rows.length) throw notFound('Product variant');
  const delta = newStock - rows[0].stock;
  if (delta === 0) return newStock;
  if (newStock < rows[0].reserved) throw conflict(`Stock cannot be set below the ${rows[0].reserved} units reserved for pending orders`);
  await tx.$executeRaw`UPDATE product_variants SET stock = ${newStock}, "updatedAt" = now() WHERE id = ${variantId}`;
  return record(tx, variantId, delta, newStock, meta);
}

/** Holds units for an unpaid order. Returns false when not enough is available. */
export async function reserve(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const count = await tx.$executeRaw`
    UPDATE product_variants SET reserved = reserved + ${qty}, "updatedAt" = now()
    WHERE id = ${variantId} AND "isActive" = true AND stock - reserved >= ${qty}`;
  return count === 1;
}

export async function release(tx: Tx, variantId: string, qty: number) {
  await tx.$executeRaw`
    UPDATE product_variants SET reserved = GREATEST(reserved - ${qty}, 0), "updatedAt" = now() WHERE id = ${variantId}`;
}

/** Turns a reservation into a sale. */
export async function commitReserved(tx: Tx, variantId: string, qty: number, meta: Omit<MovementMeta, 'type'>): Promise<number> {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    UPDATE product_variants SET stock = stock - ${qty}, reserved = GREATEST(reserved - ${qty}, 0), "updatedAt" = now()
    WHERE id = ${variantId} AND stock >= ${qty}
    RETURNING stock`;
  if (!rows.length) {
    const v = await skuOf(tx, variantId);
    throw conflict(`Not enough stock for ${v.sku}`);
  }
  return record(tx, variantId, -qty, rows[0].stock, { ...meta, type: 'SALE' });
}

/** Sells from unreserved stock (counter sales, or orders whose hold expired). */
export async function sellAvailable(tx: Tx, variantId: string, qty: number, meta: Omit<MovementMeta, 'type'>): Promise<number | null> {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    UPDATE product_variants SET stock = stock - ${qty}, "updatedAt" = now()
    WHERE id = ${variantId} AND stock - reserved >= ${qty}
    RETURNING stock`;
  if (!rows.length) return null;
  return record(tx, variantId, -qty, rows[0].stock, { ...meta, type: 'SALE' });
}

/** Moving-average cost after receiving `qty` units at `unitCost`. */
export async function updateAverageCost(tx: Tx, variantId: string, qtyBefore: number, qty: number, unitCost: number) {
  const v = await tx.productVariant.findUnique({ where: { id: variantId }, select: { costPrice: true } });
  const old = Number(v?.costPrice ?? 0);
  const before = Math.max(qtyBefore, 0);
  const avg = before > 0 && old > 0 ? (before * old + qty * unitCost) / (before + qty) : unitCost;
  await tx.productVariant.update({ where: { id: variantId }, data: { costPrice: Math.round(avg * 100) / 100 } });
}

const ADJUST_SIGN = { ADD: 1, REMOVE: -1, DAMAGED: -1, LOST: -1 } as const;

/** Manual stock adjustment from the Stock screen. Returns the new stock. */
export async function adjustStock(
  tx: Tx,
  input: { variantId: string; type: 'ADD' | 'REMOVE' | 'DAMAGED' | 'LOST' | 'CORRECTION' | 'PHYSICAL_COUNT'; quantity: number; reason: string },
  userName: string,
) {
  const label = { ADD: 'Add stock', REMOVE: 'Remove stock', DAMAGED: 'Damaged', LOST: 'Lost', CORRECTION: 'Correction', PHYSICAL_COUNT: 'Physical stock count' }[input.type];
  const meta = { type: 'ADJUSTMENT' as const, reference: label, note: input.reason, userName };
  if (input.type === 'PHYSICAL_COUNT') {
    if (input.quantity < 0) throw conflict('Counted stock cannot be negative');
    return setStock(tx, input.variantId, input.quantity, meta);
  }
  if (input.type === 'CORRECTION') return changeStock(tx, input.variantId, input.quantity, meta);
  if (input.quantity <= 0) throw conflict('Quantity must be more than zero');
  return changeStock(tx, input.variantId, ADJUST_SIGN[input.type] * input.quantity, meta);
}
