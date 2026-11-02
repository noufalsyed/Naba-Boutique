import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db';
import { storeConfig } from '@/server/config';
import { productPath } from '@/lib/slug';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = storeConfig().appUrl;
  const [cats, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.product.findMany({ where: { status: 'ACTIVE', category: { isActive: true } }, select: { slug: true, updatedAt: true, category: { select: { slug: true } }, images: { take: 1, select: { url: true } } } }),
  ]);
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly') => ({ url: `${base}${path}`, priority, changeFrequency });
  return [
    page('/', 1, 'daily'),
    page('/shop', 0.9, 'daily'),
    page('/categories', 0.7),
    page('/customized-stitching', 0.8, 'monthly'),
    ...cats.map((c) => page(`/shop/${c.slug}`, 0.8, 'daily')),
    ...products.map((p) => ({
      url: `${base}${productPath(p.category.slug, p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: p.images.map((i) => `${base}${i.url}`),
    })),
    page('/about', 0.4, 'yearly'),
    page('/contact', 0.4, 'yearly'),
    page('/shipping-returns', 0.3, 'yearly'),
    page('/privacy-policy', 0.2, 'yearly'),
    page('/terms', 0.2, 'yearly'),
  ];
}
