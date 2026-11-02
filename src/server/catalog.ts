// Storefront catalogue queries. The catalogue of a boutique is small (hundreds
// of products), so listing loads active products once and filters in memory.
import 'server-only';
import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma, n } from '@/server/db';
import { discountPercent } from '@/lib/pricing';
import { sortSizes } from '@/lib/constants';
import type { CardProduct, CardVariant } from '@/lib/types';

const cardInclude = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' }, take: 2 },
  variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toCard(p: CardRow): CardProduct {
  const variants: CardVariant[] = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    price: n(v.price),
    mrp: n(v.mrp),
    available: Math.max(v.stock - v.reserved, 0),
  }));
  const inStock = variants.filter((v) => v.available > 0);
  const pool = inStock.length ? inStock : variants;
  const cheapest = pool.reduce<CardVariant | null>((a, v) => (!a || v.price < a.price ? v : a), null);
  const price = cheapest?.price ?? 0;
  const mrp = cheapest?.mrp ?? 0;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    shortDesc: p.shortDesc ?? '',
    price,
    mrp,
    discount: discountPercent(price, mrp),
    sizes: sortSizes([...new Set(variants.map((v) => v.size))]),
    colors: [...new Set(variants.map((v) => v.color).filter(Boolean))],
    image: p.images[0]?.url ?? null,
    image2: p.images[1]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? p.name,
    inStock: inStock.length > 0,
    isNew: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    variants,
  };
}

const allActive = cache(async () => {
  const rows = await prisma.product.findMany({
    where: { status: 'ACTIVE', category: { isActive: true }, variants: { some: { isActive: true } } },
    include: cardInclude,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({ card: toCard(r), createdAt: r.createdAt, soldCount: r.soldCount, isFeatured: r.isFeatured, description: r.description ?? '', fabric: r.fabric ?? '' }));
});

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'best-selling';

export interface ListQuery {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  flag?: 'new' | 'best' | 'featured';
  sort?: SortKey;
}

export async function listProducts(query: ListQuery) {
  const all = await allActive();
  const q = query.q?.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];
  let rows = all.filter(({ card, isFeatured, description, fabric }) => {
    if (query.category && card.categorySlug !== query.category) return false;
    if (query.flag === 'new' && !card.isNew) return false;
    if (query.flag === 'best' && !card.isBestSeller) return false;
    if (query.flag === 'featured' && !isFeatured) return false;
    if (query.inStock && !card.inStock) return false;
    if (query.min != null && card.price < query.min) return false;
    if (query.max != null && card.price > query.max) return false;
    if (query.sizes?.length && !card.sizes.some((s) => query.sizes!.includes(s))) return false;
    if (query.colors?.length && !card.colors.some((c) => query.colors!.includes(c))) return false;
    if (words.length) {
      const hay = `${card.name} ${card.categoryName} ${card.shortDesc} ${description} ${fabric} ${card.colors.join(' ')} ${card.variants.map((v) => v.sku).join(' ')}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const sort = query.sort ?? 'newest';
  rows = [...rows].sort((a, b) => {
    // Sold-out products sink to the end in every sort.
    if (a.card.inStock !== b.card.inStock) return a.card.inStock ? -1 : 1;
    switch (sort) {
      case 'price-asc':
        return a.card.price - b.card.price;
      case 'price-desc':
        return b.card.price - a.card.price;
      case 'popular':
        return Number(b.isFeatured) - Number(a.isFeatured) || b.soldCount - a.soldCount;
      case 'best-selling':
        return b.soldCount - a.soldCount || Number(b.card.isBestSeller) - Number(a.card.isBestSeller);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });
  return rows.map((r) => r.card);
}

export async function facets() {
  const all = await allActive();
  const sizes = sortSizes([...new Set(all.flatMap((r) => r.card.sizes))]);
  const colors = [...new Set(all.flatMap((r) => r.card.colors))].sort();
  const prices = all.map((r) => r.card.price);
  return { sizes, colors, minPrice: prices.length ? Math.min(...prices) : 0, maxPrice: prices.length ? Math.max(...prices) : 0 };
}

export const getCategories = cache(() =>
  prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
  }),
);

export const getProduct = cache(async (slug: string) => {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 6 },
    },
  });
  if (!p || p.status !== 'ACTIVE' || !p.category.isActive) return null;
  return p;
});

export async function relatedProducts(productId: string, categorySlug: string, limit = 4) {
  const all = await allActive();
  return all
    .filter((r) => r.card.id !== productId && r.card.categorySlug === categorySlug && r.card.inStock)
    .slice(0, limit)
    .map((r) => r.card);
}

export const approvedReviews = cache(() => prisma.review.findMany({ where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 6 }));
