import type { Metadata } from 'next';
import { ShopPage, parseQuery, type SearchParams } from '@/components/store/shop-page';

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const flag = sp.flag;
  const title = flag === 'new' ? 'New Arrivals' : flag === 'best' ? 'Best Sellers' : 'Shop Ladies Ethnic Wear';
  return {
    title,
    description: 'Shop ladies chudidhars, dress materials, ethnic wear and fabrics online. Filter by size, colour and price. UPI, card and WhatsApp ordering.',
    alternates: { canonical: flag ? `/shop?flag=${flag}` : '/shop' },
    robots: sp.q || sp.size || sp.color || sp.min || sp.max ? { index: false, follow: true } : undefined,
  };
}

export default async function Shop({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = parseQuery(sp);
  const title = query.flag === 'new' ? 'New Arrivals' : query.flag === 'best' ? 'Best Sellers' : query.flag === 'featured' ? 'Featured' : 'Shop All';
  return (
    <ShopPage
      query={query}
      title={title}
      intro="Elegant chudidhars, dress materials, ethnic wear and fabrics — thoughtfully chosen, ready to wear or stitched for you."
      crumbs={[{ name: 'Home', href: '/' }, { name: 'Shop', href: '/shop' }]}
    />
  );
}
