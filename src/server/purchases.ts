// Purchase entry: stock received from suppliers. A purchase saved as a draft
// changes nothing; receiving it adds every line to stock (creating products
// that do not exist yet) and records a Purchase stock movement per line.
import 'server-only';
import type { Prisma } from '@prisma/client';
import { transaction, n, type Tx } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { nextDocNumber, nextSku } from '@/server/sequence';
import { changeStock, updateAverageCost } from '@/server/stock';
import { round2 } from '@/lib/format';
import { slugify } from '@/lib/slug';
import type { PurchaseInput } from '@/lib/validators';

type ItemInput = PurchaseInput['items'][number];

export const lineTotal = (i: { quantity: number; purchasePrice: number; discount?: number }) => round2(i.quantity * i.purchasePrice - (i.discount ?? 0));

export function purchaseTotals(items: { quantity: number; purchasePrice: number; discount?: number }[], discount: number, additionalCharges: number) {
  const subtotal = round2(items.reduce((s, i) => s + lineTotal(i), 0));
  return { subtotal, discount, additionalCharges, grandTotal: round2(subtotal - discount + additionalCharges) };
}

async function itemRows(tx: Tx, items: ItemInput[]) {
  const rows: Prisma.PurchaseItemCreateWithoutPurchaseInput[] = [];
  for (const it of items) {
    if (lineTotal(it) < 0) throw badRequest(`Discount on ${it.productName} is more than the line value`);
    let variantId = it.variantId ?? null;
    let sku = it.sku;
    let categoryName: string | null = null;
    if (!variantId && sku) {
      const existing = await tx.productVariant.findUnique({ where: { sku }, select: { id: true } });
      if (existing) variantId = existing.id;
    }
    if (variantId) {
      const v = await tx.productVariant.findUnique({ where: { id: variantId }, include: { product: { include: { category: true } } } });
      if (!v) throw notFound('Product variant');
      sku = v.sku;
      categoryName = v.product.category.name;
      rows.push({
        variant: { connect: { id: v.id } },
        productName: v.product.name,
        sku,
        categoryId: v.product.categoryId,
        categoryName,
        size: v.size,
        color: v.color,
        quantity: it.quantity,
        purchasePrice: it.purchasePrice,
        sellingPrice: it.sellingPrice,
        mrp: it.mrp ?? null,
        discount: it.discount,
        total: lineTotal(it),
      });
    } else {
      if (!it.categoryId) throw badRequest(`Choose a category for new product ${it.productName}`);
      const cat = await tx.category.findUnique({ where: { id: it.categoryId } });
      if (!cat) throw badRequest(`Unknown category for ${it.productName}`);
      rows.push({
        productName: it.productName,
        sku: sku ?? '',
        categoryId: cat.id,
        categoryName: cat.name,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        purchasePrice: it.purchasePrice,
        sellingPrice: it.sellingPrice,
        mrp: it.mrp ?? null,
        discount: it.discount,
        total: lineTotal(it),
      });
    }
  }
  return rows;
}

export async function savePurchase(input: PurchaseInput, userName: string, purchaseId?: string) {
  const purchase = await transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw badRequest('Choose a supplier');
    const totals = purchaseTotals(input.items, input.discount, input.additionalCharges);
    if (totals.grandTotal < 0) throw badRequest('Discount is more than the purchase value');
    const header = {
      supplierId: supplier.id,
      supplierContact: input.supplierContact ?? supplier.phone,
      invoiceNumber: input.invoiceNumber,
      purchaseDate: new Date(`${input.purchaseDate}T12:00:00+05:30`),
      paymentStatus: input.paymentStatus,
      notes: input.notes,
      ...totals,
    };
    const items = await itemRows(tx, input.items);
    if (purchaseId) {
      const existing = await tx.purchase.findUnique({ where: { id: purchaseId } });
      if (!existing) throw notFound('Purchase');
      if (existing.status !== 'DRAFT') throw conflict('Only draft purchases can be edited. Received purchases are corrected with a purchase return or stock adjustment.');
      await tx.purchaseItem.deleteMany({ where: { purchaseId } });
      return tx.purchase.update({ where: { id: purchaseId }, data: { ...header, items: { create: items } } });
    }
    return tx.purchase.create({ data: { ...header, number: await nextDocNumber(tx, 'PURCHASE'), createdByName: userName, items: { create: items } } });
  });
  if (input.receive) await receivePurchase(purchase.id, userName);
  return purchase;
}

/** Adds the purchase to stock. Existing SKU: stock + qty. New product: created with this stock. */
export async function receivePurchase(purchaseId: string, userName: string) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${purchaseId} FOR UPDATE`;
    const p = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: true, supplier: true } });
    if (!p) throw notFound('Purchase');
    if (p.status !== 'DRAFT') throw conflict(`This purchase is already ${p.status.toLowerCase()}`);
    for (const it of p.items) {
      let variantId = it.variantId;
      if (!variantId) variantId = await createProductForLine(tx, it, p.supplierId);
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
      await updateAverageCost(tx, v.id, v.stock, it.quantity, it.quantity ? n(it.total) / it.quantity : n(it.purchasePrice));
      await tx.productVariant.update({
        where: { id: v.id },
        data: { price: it.sellingPrice, ...(it.mrp != null ? { mrp: it.mrp } : n(v.mrp) < n(it.sellingPrice) ? { mrp: it.sellingPrice } : {}) },
      });
      await changeStock(tx, v.id, it.quantity, { type: 'PURCHASE', reference: p.number, note: p.supplier.name, userName });
      if (it.variantId !== v.id) await tx.purchaseItem.update({ where: { id: it.id }, data: { variantId: v.id, sku: v.sku } });
    }
    return tx.purchase.update({ where: { id: p.id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
  });
}

async function createProductForLine(
  tx: Tx,
  it: { productName: string; sku: string; categoryId: string | null; size: string; color: string; sellingPrice: Prisma.Decimal; mrp: Prisma.Decimal | null; purchasePrice: Prisma.Decimal },
  supplierId: string,
) {
  if (!it.categoryId) throw badRequest(`Category missing for ${it.productName}`);
  // A new size/colour of an existing product name joins that product.
  let product = await tx.product.findFirst({ where: { name: { equals: it.productName, mode: 'insensitive' }, categoryId: it.categoryId } });
  if (!product) {
    let slug = slugify(it.productName) || 'product';
    if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    product = await tx.product.create({ data: { name: it.productName, slug, categoryId: it.categoryId, supplierId, status: 'ACTIVE', isNewArrival: true } });
  }
  const sku = it.sku || (await nextSku(tx));
  const v = await tx.productVariant.create({
    data: { productId: product.id, sku, size: it.size, color: it.color, price: it.sellingPrice, mrp: it.mrp ?? it.sellingPrice, costPrice: 0 },
  });
  return v.id;
}

export async function cancelPurchase(purchaseId: string) {
  const p = await transaction(async (tx) => {
    const p = await tx.purchase.findUnique({ where: { id: purchaseId } });
    if (!p) throw notFound('Purchase');
    if (p.status !== 'DRAFT') throw conflict('Only draft purchases can be cancelled. Use a purchase return for received stock.');
    return tx.purchase.update({ where: { id: purchaseId }, data: { status: 'CANCELLED' } });
  });
  return p;
}

/** Sends received stock back to the supplier. */
export async function createPurchaseReturn(purchaseId: string, input: { reason?: string; items: { purchaseItemId: string; quantity: number }[] }, userName: string) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${purchaseId} FOR UPDATE`;
    const p = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
    if (!p) throw notFound('Purchase');
    if (p.status !== 'RECEIVED') throw conflict('Only received purchases can be returned');
    const number = await nextDocNumber(tx, 'PURCHASE_RETURN');
    let amount = 0;
    const rows: { purchaseItemId: string; quantity: number; amount: number }[] = [];
    for (const r of input.items) {
      const it = p.items.find((i) => i.id === r.purchaseItemId);
      if (!it || !it.variantId) throw badRequest('Item does not belong to this purchase');
      if (r.quantity > it.quantity - it.returnedQty) throw badRequest(`Only ${it.quantity - it.returnedQty} of ${it.sku} can be returned`);
      const lineAmount = round2((n(it.total) / it.quantity) * r.quantity);
      amount += lineAmount;
      rows.push({ purchaseItemId: it.id, quantity: r.quantity, amount: lineAmount });
      await changeStock(tx, it.variantId, -r.quantity, { type: 'PURCHASE_RETURN', reference: number, note: input.reason, userName });
      await tx.purchaseItem.update({ where: { id: it.id }, data: { returnedQty: { increment: r.quantity } } });
    }
    return tx.purchaseReturn.create({ data: { number, purchaseId, reason: input.reason, amount: round2(amount), createdByName: userName, items: { create: rows } } });
  });
}
