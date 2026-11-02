import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopPage, parseQuery, type SearchParams } from '@/components/store/shop-page';
import { getCategories } from '@/server/catalog';

type Params = Promise<{ category: string }>;

const SEO: Record<string, string> = {
  chudidhars: 'Ladies chudidhars in Kerala — cotton, printed and festive chudidhar sets in all sizes, with custom stitching.',
  'dress-materials': 'Ladies dress materials online — georgette, chanderi, chikankari and party wear materials. Get them stitched to fit.',
  'ethnic-wear': 'Ladies ethnic wear — anarkalis, kurti sets, shararas and dupattas for festivals and weddings.',
  fabrics: 'Premium fabrics — pure cotton, linen blends and Kerala kasavu pieces for your next outfit.',
};

async function find(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await find((await params).category);
  if (!c) return {};
  return {
    title: `${c.name} for Women`,
    description: SEO[c.slug] ?? c.description ?? `Shop ${c.name} online at Feathers – The 2nd Skin.`,
    alternates: { canonical: `/shop/${c.slug}` },
    openGraph: { images: c.imageUrl ? [c.imageUrl] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const c = await find((await params).category);
  if (!c) notFound();
  return (
    <ShopPage
      query={parseQuery(await searchParams, c.slug)}
      title={c.name}
      intro={c.description ?? undefined}
      categorySlug={c.slug}
      crumbs={[
        { name: 'Home', href: '/' },
        { name: 'Shop', href: '/shop' },
        { name: c.name, href: `/shop/${c.slug}` },
      ]}
    />
  );
}
