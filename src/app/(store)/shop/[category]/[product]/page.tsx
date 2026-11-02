import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Scissors, Star } from 'lucide-react';
import { ProductGallery } from '@/components/store/product-gallery';
import { ProductBuy } from '@/components/store/product-buy';
import { ProductCard } from '@/components/store/product-card';
import { Breadcrumbs, JsonLd } from '@/components/store/seo';
import { getProduct, relatedProducts, toCard } from '@/server/catalog';
import { publicConfig } from '@/server/config';
import { productPath } from '@/lib/slug';
import { BRAND } from '@/lib/constants';

type Params = Promise<{ category: string; product: string }>;

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProduct((await params).product);
  if (!p) return {};
  const card = toCard(p);
  const path = productPath(p.category.slug, p.slug);
  const description = (p.shortDesc || p.description || `${p.name} — ${p.category.name}`).slice(0, 155);
  return {
    title: `${p.name} – ${p.category.name}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: p.name,
      description,
      url: path,
      images: p.images.slice(0, 2).map((i) => ({ url: i.url, width: 800, height: 1000, alt: i.alt ?? p.name })),
    },
    other: { 'product:price:amount': String(card.price), 'product:price:currency': 'INR' },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { category, product } = await params;
  const p = await getProduct(product);
  if (!p) notFound();
  if (p.category.slug !== category) permanentRedirect(productPath(p.category.slug, p.slug));

  const config = publicConfig();
  const card = toCard(p);
  const path = productPath(p.category.slug, p.slug);
  const url = `${config.appUrl}${path}`;
  const related = await relatedProducts(p.id, p.category.slug);
  const avg = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : null;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description ?? p.shortDesc ?? undefined,
    sku: card.variants[0]?.sku,
    image: p.images.map((i) => `${config.appUrl}${i.url}`),
    brand: { '@type': 'Brand', name: BRAND },
    category: p.category.name,
    material: p.fabric ?? undefined,
    color: card.colors.join(', ') || undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: Math.min(...card.variants.map((v) => v.price)),
      highPrice: Math.max(...card.variants.map((v) => v.price)),
      offerCount: card.variants.length,
      availability: card.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    },
    ...(avg ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <div className="container-x py-6 md:py-10">
      <JsonLd data={ld} />
      <Breadcrumbs
        appUrl={config.appUrl}
        crumbs={[
          { name: 'Home', href: '/' },
          { name: 'Shop', href: '/shop' },
          { name: p.category.name, href: `/shop/${p.category.slug}` },
          { name: p.name, href: path },
        ]}
      />
      <div className="mt-5 grid gap-8 md:grid-cols-2 lg:gap-14">
        <ProductGallery images={p.images} name={p.name} />
        <div className="md:sticky md:top-28 md:self-start">
          <p className="eyebrow">{p.category.name}{p.subcategory ? ` · ${p.subcategory}` : ''}</p>
          <h1 className="mt-2 text-[34px] leading-[1.1] md:text-[44px]">{p.name}</h1>
          {avg && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <Star size={14} className="fill-gold text-gold" /> {avg.toFixed(1)} · {p.reviews.length} review{p.reviews.length === 1 ? '' : 's'}
            </p>
          )}
          {p.shortDesc && <p className="mt-3 text-[15px] leading-7 text-ink/85">{p.shortDesc}</p>}
          <div className="mt-6">
            <ProductBuy product={card} url={url} />
          </div>
          <Link href="/customized-stitching" className="mt-6 flex items-center gap-3 bg-sand p-4 text-[14px] transition-colors hover:bg-nude">
            <Scissors size={20} className="shrink-0 text-wine" strokeWidth={1.5} />
            <span>
              <span className="font-medium">Want it made to measure?</span> Request custom stitching with your measurements and design.
            </span>
          </Link>
        </div>
      </div>

      <section className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="text-3xl">Product Details</h2>
          <div className="prose-store mt-3 max-w-2xl">{p.description ? p.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>) : <p>{p.shortDesc}</p>}</div>
        </div>
        <dl className="space-y-4 text-[14px]">
          {[
            ['Fabric / Material', p.fabric],
            ['Colours', card.colors.join(', ')],
            ['Sizes', card.sizes.join(', ')],
            ['Product Code', card.variants.map((v) => v.sku).slice(0, 1).join('') + (card.variants.length > 1 ? ` (+${card.variants.length - 1} variants)` : '')],
            ['Care', p.careNotes],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="border-b border-line pb-3">
                <dt className="label">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      {p.reviews.length > 0 && (
        <section className="mt-14">
          <h2 className="text-3xl">Customer Reviews</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {p.reviews.map((r) => (
              <figure key={r.id} className="bg-sand p-5">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, k) => (
                    <Star key={k} size={13} className={k < r.rating ? 'fill-gold text-gold' : 'text-beige'} />
                  ))}
                </div>
                <blockquote className="mt-2 text-[14px]">{r.text}</blockquote>
                <figcaption className="mt-2 text-[12px] text-muted">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-3xl md:text-4xl">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
