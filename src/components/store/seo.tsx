import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BRAND, BRAND_QUOTE } from '@/lib/constants';
import type { PublicConfig } from '@/server/config';

/** Renders JSON-LD safely (closing-tag sequences are escaped). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export function organizationLd(c: PublicConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: BRAND,
    slogan: BRAND_QUOTE,
    url: c.appUrl,
    logo: `${c.appUrl}/icon.svg`,
    image: `${c.appUrl}/opengraph-image`,
    description: 'Ladies chudidhars, dress materials, ethnic wear, fabrics and customized stitching in Kerala.',
    telephone: c.phone || undefined,
    email: c.email || undefined,
    address: { '@type': 'PostalAddress', addressRegion: 'Kerala', addressCountry: 'IN', streetAddress: c.address },
    sameAs: [c.instagramUrl, c.facebookUrl].filter(Boolean),
    priceRange: '₹₹',
  };
}

export interface Crumb {
  name: string;
  href: string;
}

export function breadcrumbLd(appUrl: string, crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${appUrl}${c.href}` })),
  };
}

export function Breadcrumbs({ crumbs, appUrl }: { crumbs: Crumb[]; appUrl: string }) {
  return (
    <>
      <JsonLd data={breadcrumbLd(appUrl, crumbs)} />
      <nav aria-label="Breadcrumb" className="no-scrollbar overflow-x-auto">
        <ol className="flex items-center gap-1.5 text-[12px] whitespace-nowrap text-muted">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-beige" />}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="text-charcoal">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-wine">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
