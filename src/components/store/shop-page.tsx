import { Suspense } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/store/product-card';
import { FilterSidebar, ShopToolbar, type FacetData } from '@/components/store/shop-filters';
import { Breadcrumbs, type Crumb } from '@/components/store/seo';
import { facets, getCategories, listProducts, type ListQuery, type SortKey } from '@/server/catalog';
import { publicConfig } from '@/server/config';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS: SortKey[] = ['newest', 'price-asc', 'price-desc', 'popular', 'best-selling'];
const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => {
  const x = Number(one(v));
  return one(v) && Number.isFinite(x) ? x : undefined;
};

export function parseQuery(sp: Record<string, string | string[] | undefined>, category?: string): ListQuery {
  const sort = one(sp.sort) as SortKey;
  const flag = one(sp.flag);
  return {
    q: one(sp.q)?.slice(0, 80),
    category,
    min: num(sp.min),
    max: num(sp.max),
    sizes: arr(sp.size),
    colors: arr(sp.color),
    inStock: one(sp.stock) === 'in',
    flag: flag === 'new' || flag === 'best' || flag === 'featured' ? flag : undefined,
    sort: SORTS.includes(sort) ? sort : undefined,
  };
}

export async function ShopPage({ query, title, intro, crumbs, categorySlug }: { query: ListQuery; title: string; intro?: string; crumbs: Crumb[]; categorySlug?: string }) {
  const [products, f, cats] = await Promise.all([listProducts(query), facets(), getCategories()]);
  const facetData: FacetData = { ...f, categories: cats.map((c) => ({ slug: c.slug, name: c.name, count: c._count.products })) };
  return (
    <div className="container-x py-8 md:py-12">
      <Breadcrumbs crumbs={crumbs} appUrl={publicConfig().appUrl} />
      <header className="mt-5 mb-6 md:mb-8">
        <h1 className="text-[38px] leading-tight md:text-[52px]">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-muted">{intro}</p>}
      </header>
      <div className="flex gap-10">
        <Suspense>
          <FilterSidebar facets={facetData} fixedCategory={categorySlug} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <Suspense>
            <ShopToolbar facets={facetData} total={products.length} fixedCategory={categorySlug} />
          </Suspense>
          {query.q && (
            <p className="mb-5 text-[14px] text-muted">
              {products.length} result{products.length === 1 ? '' : 's'} for “<span className="text-charcoal">{query.q}</span>”
            </p>
          )}
          {products.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-line px-6 py-20 text-center">
              <p className="font-serif text-3xl">No products found</p>
              <p className="mt-2 text-muted">Try removing a filter, or ask us on WhatsApp — we may have it in store.</p>
              <Link href="/shop" className="btn-outline mt-6">
                View all products
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
