import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Scissors, Sparkles, Star } from 'lucide-react';
import { Reveal } from '@/components/store/reveal';
import { getCategories } from '@/server/catalog';

export const metadata: Metadata = {
  title: 'Shop by Category',
  description: 'Browse chudidhars, dress materials, ethnic wear and fabrics, or request customized stitching.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  const cats = await getCategories();
  const extra = [
    { href: '/shop?flag=new', title: 'New Arrivals', sub: 'The latest pieces in store', Icon: Sparkles },
    { href: '/shop?flag=best', title: 'Best Sellers', sub: 'Our most-loved styles', Icon: Star },
    { href: '/customized-stitching', title: 'Customized Stitching', sub: 'Your material, your measurements', Icon: Scissors },
  ];
  return (
    <div className="container-x py-10 md:py-14">
      <p className="eyebrow">Browse</p>
      <h1 className="mt-2 text-[40px] md:text-[54px]">Categories</h1>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {cats.map((c, i) => (
          <Reveal key={c.id} delay={i * 60}>
            <Link href={`/shop/${c.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-sand">
              {c.imageUrl && <Image src={c.imageUrl} alt={c.name} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-ivory md:p-5">
                <h2 className="text-[24px] leading-tight md:text-[30px]">{c.name}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] text-ivory/80">
                  {c._count.products} styles <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3 md:gap-5">
        {extra.map(({ href, title, sub, Icon }) => (
          <Link key={href} href={href} className="group flex items-center gap-4 border border-line bg-white p-5 transition-colors hover:border-charcoal">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-wine">
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-[22px] leading-tight">{title}</span>
              <span className="text-[13px] text-muted">{sub}</span>
            </span>
            <ArrowRight size={16} className="text-muted transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
