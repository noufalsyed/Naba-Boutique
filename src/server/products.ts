import 'server-only';
import { transaction, prisma } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { nextSku } from '@/server/sequence';
import { changeStock } from '@/server/stock';
import { slugify } from '@/lib/slug';
import type { ProductInput } from '@/lib/validators';

/** Creates or updates a product with its images and variants. Stock is never edited here except opening stock of new variants. */
export async function saveProduct(input: ProductInput, userName: string, productId?: string) {
  for (const v of input.variants) if (v.mrp && v.mrp < v.price) throw badRequest(`MRP of ${v.size}${v.color ? ` / ${v.color}` : ''} is lower than its selling price`);
  const combos = new Set<string>();
  for (const v of input.variants) {
    const k = `${v.size.toLowerCase()}|${v.color.toLowerCase()}`;
    if (combos.has(k)) throw badRequest(`Size ${v.size}${v.color ? ` / ${v.color}` : ''} is listed twice`);
    combos.add(k);
  }
  const skus = input.variants.map((v) => v.sku).filter(Boolean) as string[];
  if (new Set(skus).size !== skus.length) throw badRequest('Each variant needs a different SKU');

  return transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw badRequest('Choose a category');
    let slug = slugify(input.slug || input.name) || 'product';
    const clash = await tx.product.findFirst({ where: { slug, ...(productId ? { id: { not: productId } } : {}) } });
    if (clash) {
      if (input.slug) throw badRequest('Another product already uses this URL slug', { slug: 'Already in use' });
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const data = {
      name: input.name,
      slug,
      categoryId: input.categoryId,
      subcategory: input.subcategory ?? null,
      shortDesc: input.shortDesc ?? null,
      description: input.description ?? null,
      fabric: input.fabric ?? null,
      careNotes: input.careNotes ?? null,
      supplierId: input.supplierId || null,
      isFeatured: input.isFeatured,
      isNewArrival: input.isNewArrival,
      isBestSeller: input.isBestSeller,
      status: input.status,
    };
    let product;
    if (productId) {
      const existing = await tx.product.findUnique({ where: { id: productId } });
      if (!existing) throw notFound('Product');
      product = await tx.product.update({ where: { id: productId }, data });
      await tx.productImage.deleteMany({ where: { productId } });
    } else {
      product = await tx.product.create({ data });
    }
    if (input.images.length) {
      await tx.productImage.createMany({ data: input.images.map((img, i) => ({ productId: product.id, url: img.url, alt: img.alt ?? product.name, sortOrder: i })) });
    }

    const existingVariants = await tx.productVariant.findMany({ where: { productId: product.id } });
    const keep = new Set<string>();
    for (const v of input.variants) {
      if (v.sku) {
        const other = await tx.productVariant.findUnique({ where: { sku: v.sku } });
        if (other && other.id !== v.id) throw conflict(`SKU ${v.sku} is already used by another product`);
      }
      const fields = { size: v.size, color: v.color, price: v.price, mrp: v.mrp || v.price, costPrice: v.costPrice, lowStockLevel: v.lowStockLevel, isActive: v.isActive };
      const current = v.id ? existingVariants.find((e) => e.id === v.id) : undefined;
      if (current) {
        await tx.productVariant.update({ where: { id: current.id }, data: { ...fields, sku: v.sku ?? current.sku } });
        keep.add(current.id);
      } else {
        const created = await tx.productVariant.create({ data: { ...fields, productId: product.id, sku: v.sku ?? (await nextSku(tx)) } });
        keep.add(created.id);
        if (v.openingStock > 0) await changeStock(tx, created.id, v.openingStock, { type: 'OPENING_STOCK', reference: 'Product created', userName });
      }
    }
    // Variants removed from the form: deleted if they have no history, otherwise deactivated.
    for (const e of existingVariants.filter((x) => !keep.has(x.id))) {
      const used = (await tx.orderItem.count({ where: { variantId: e.id } })) + (await tx.stockMovement.count({ where: { variantId: e.id } }));
      if (used) await tx.productVariant.update({ where: { id: e.id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id: e.id } });
    }
    return product;
  });
}

/** Products with sales or stock history are archived instead of deleted, so reports stay intact. */
export async function deleteProduct(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: { variants: { select: { id: true } } } });
  if (!p) throw notFound('Product');
  const ids = p.variants.map((v) => v.id);
  const used = (await prisma.orderItem.count({ where: { variantId: { in: ids } } })) + (await prisma.purchaseItem.count({ where: { variantId: { in: ids } } }));
  if (used) {
    await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
    return { archived: true };
  }
  await prisma.$transaction([prisma.stockMovement.deleteMany({ where: { variantId: { in: ids } } }), prisma.product.delete({ where: { id } })]);
  return { archived: false };
}
