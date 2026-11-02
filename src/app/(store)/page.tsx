import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Ruler, Scissors, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import { ProductCard } from '@/components/store/product-card';
import { Reveal } from '@/components/store/reveal';
import { InstagramIcon, WhatsAppIcon } from '@/components/store/icons';
import { approvedReviews, getCategories, listProducts } from '@/server/catalog';
import { publicConfig } from '@/server/config';
import { waLink } from '@/lib/whatsapp';
import { productPath } from '@/lib/slug';

export const revalidate = 60;

function SectionTitle({ eyebrow, title, href, linkLabel = 'View all' }: { eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-[32px] leading-tight md:text-[42px]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group hidden shrink-0 items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-charcoal hover:text-wine sm:flex">
          {linkLabel} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const config = publicConfig();
  const [newArrivals, bestSellers, featured, categories, reviews, all] = await Promise.all([
    listProducts({ flag: 'new', sort: 'newest' }),
    listProducts({ flag: 'best', sort: 'best-selling' }),
    listProducts({ flag: 'featured', sort: 'popular' }),
    getCategories(),
    approvedReviews(),
    listProducts({ sort: 'popular' }),
  ]);
  const heroA = featured.find((p) => p.image) ?? all[0];
  const heroB = featured.find((p) => p.image && p.id !== heroA?.id) ?? all[1];
  const instagram = all.filter((p) => p.image).slice(0, 6);

  const catCards = [
    ...categories.map((c) => ({ href: `/shop/${c.slug}`, title: c.name, sub: `${c._count.products} styles`, image: c.imageUrl })),
    { href: '/customized-stitching', title: 'Customized Stitching', sub: 'Made to measure', image: null, tone: 'bg-wine' },
    { href: '/shop?flag=new', title: 'New Arrivals', sub: 'Just landed', image: newArrivals[0]?.image ?? null },
    { href: '/shop?flag=best', title: 'Best Sellers', sub: 'Most loved', image: bestSellers[0]?.image ?? null },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-sand">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-blush/70 blur-3xl" />
        <div className="container-x relative grid items-center gap-10 py-10 md:grid-cols-12 md:py-20">
          <div className="animate-fade-up md:col-span-6 lg:col-span-5">
            <p className="eyebrow">Feathers – The 2nd Skin</p>
            <h1 className="mt-4 text-[44px] leading-[1.02] font-medium text-charcoal sm:text-[56px] lg:text-[68px]">
              Your Style.
              <br />
              Your Fit.
              <br />
              <span className="italic text-wine">Your Second Skin.</span>
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-7 text-ink/80">
              Discover elegant ethnic wear, premium dress materials and customized stitching crafted specially for you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className="btn-primary px-8 py-4">
                Shop Now
              </Link>
              <Link href="/customized-stitching" className="btn-outline px-8 py-4">
                Customized Stitching
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5 text-[12px] text-muted">
              <span className="flex items-center gap-1.5"><Star size={14} className="fill-gold text-gold" /> Loved across Kerala</span>
              <span className="flex items-center gap-1.5"><Truck size={14} /> Pan-India delivery</span>
            </div>
          </div>
          <div className="relative md:col-span-6 lg:col-span-7">
            <div className="relative mx-auto grid max-w-xl grid-cols-5 gap-3 md:gap-4">
              {heroA?.image && (
                <Link href={productPath(heroA.categorySlug, heroA.slug)} className="relative col-span-3 aspect-[4/5] overflow-hidden bg-nude shadow-[0_30px_60px_-30px_rgba(42,38,36,.45)]">
                  <Image src={heroA.image} alt={heroA.imageAlt} fill priority sizes="(min-width: 768px) 30vw, 60vw" className="object-cover transition-transform duration-[1.5s] hover:scale-105" />
                </Link>
              )}
              <div className="col-span-2 flex flex-col gap-3 pt-10 md:gap-4 md:pt-16">
                {heroB?.image && (
                  <Link href={productPath(heroB.categorySlug, heroB.slug)} className="relative aspect-[4/5] overflow-hidden bg-nude">
                    <Image src={heroB.image} alt={heroB.imageAlt} fill priority sizes="(min-width: 768px) 20vw, 40vw" className="object-cover transition-transform duration-[1.5s] hover:scale-105" />
                  </Link>
                )}
                <div className="bg-wine p-4 text-ivory md:p-5">
                  <p className="font-serif text-[22px] leading-tight italic md:text-[26px]">Made to fit you</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ivory/70">Custom stitching</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section className="border-y border-line bg-ivory">
        <div className="container-x no-scrollbar flex gap-8 overflow-x-auto py-5 text-[12px] whitespace-nowrap text-muted md:justify-between">
          {[
            { Icon: Truck, t: `Free shipping above ₹${config.shipping.freeAbove.toLocaleString('en-IN')}` },
            { Icon: Scissors, t: 'Customized stitching' },
            { Icon: ShieldCheck, t: 'Secure UPI & card payments' },
            { Icon: WhatsAppIcon, t: 'Order easily on WhatsApp' },
          ].map(({ Icon, t }) => (
            <span key={t} className="flex items-center gap-2 uppercase tracking-[0.14em]">
              <Icon size={16} className="text-wine" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* Featured categories */}
      <section className="container-x pt-16 md:pt-24">
        <SectionTitle eyebrow="Explore" title="Featured Categories" href="/categories" linkLabel="All categories" />
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-7">
          {catCards.map((c, i) => (
            <Reveal key={c.href} delay={i * 60} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto">
              <Link href={c.href} className="group block">
                <div className={`relative aspect-[3/4] overflow-hidden ${c.image ? 'bg-sand' : 'bg-wine'}`}>
                  {c.image ? (
                    <Image src={c.image} alt={c.title} fill sizes="(min-width: 1024px) 14vw, (min-width: 768px) 25vw, 42vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-ivory">
                      <Scissors size={30} strokeWidth={1.2} />
                      <span className="font-serif text-[20px] leading-tight italic">Designed for you</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-transparent opacity-80" />
                </div>
                <h3 className="mt-3 font-serif text-[19px] leading-tight group-hover:text-wine">{c.title}</h3>
                <p className="text-[12px] text-muted">{c.sub}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x pt-16 md:pt-24">
        <SectionTitle eyebrow="Just in" title="New Arrivals" href="/shop?flag=new" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
          {newArrivals.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* Custom stitching */}
      <section className="mt-16 bg-charcoal text-ivory md:mt-24">
        <div className="container-x grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-rose">Customized Stitching</p>
            <h2 className="mt-3 text-[40px] leading-tight md:text-[56px]">
              Made to <span className="italic text-rose">Fit You.</span>
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-7 text-ivory/75">
              Choose your favourite material and let us create a look tailored to your style and measurements.
            </p>
            <ul className="mt-8 grid max-w-md grid-cols-1 gap-4 text-[14px] text-ivory/85 sm:grid-cols-3">
              {[
                { Icon: Sparkles, t: 'Pick a material or bring your own' },
                { Icon: Ruler, t: 'Share measurements & design' },
                { Icon: Scissors, t: 'Stitched with care, delivered' },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-start gap-2.5 sm:flex-col">
                  <Icon size={20} className="shrink-0 text-gold" strokeWidth={1.4} /> {t}
                </li>
              ))}
            </ul>
            <Link href="/customized-stitching" className="btn-light mt-10 px-8 py-4">
              Request Custom Stitching
            </Link>
          </Reveal>
          <Reveal delay={120} className="grid grid-cols-2 gap-3">
            {featured.slice(0, 2).map((p, i) =>
              p.image ? (
                <div key={p.id} className={`relative aspect-[3/4] overflow-hidden ${i === 1 ? 'mt-10' : ''}`}>
                  <Image src={p.image} alt={p.imageAlt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                </div>
              ) : null,
            )}
          </Reveal>
        </div>
      </section>

      {/* Best sellers */}
      <section className="container-x pt-16 md:pt-24">
        <SectionTitle eyebrow="Most loved" title="Best Sellers" href="/shop?flag=best" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
          {bestSellers.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-16 bg-sand md:mt-24">
          <div className="container-x py-16 md:py-20">
            <div className="text-center">
              <p className="eyebrow">Kind words</p>
              <h2 className="mt-2 text-[32px] md:text-[42px]">What Our Customers Say</h2>
            </div>
            <div className="no-scrollbar -mx-4 mt-10 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
              {reviews.slice(0, 6).map((r, i) => (
                <Reveal key={r.id} delay={i * 70} className="w-[82%] shrink-0 snap-center md:w-auto">
                  <figure className="flex h-full flex-col bg-ivory p-7">
                    <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star key={k} size={14} className={k < r.rating ? 'fill-gold text-gold' : 'text-beige'} />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 font-serif text-[20px] leading-snug text-charcoal italic">“{r.text}”</blockquote>
                    <figcaption className="mt-5 text-[12px] uppercase tracking-[0.16em] text-muted">
                      {r.name}
                      {r.location ? ` · ${r.location}` : ''}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Instagram */}
      <section className="container-x pt-16 md:pt-24">
        <div className="text-center">
          <InstagramIcon size={26} className="mx-auto text-wine" />
          <h2 className="mt-3 text-[32px] md:text-[42px]">Follow Us on Instagram</h2>
          <p className="mt-2 text-muted">New drops, styling ideas and behind-the-seams stories.</p>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-1.5 md:grid-cols-6 md:gap-3">
          {instagram.map((p) => (
            <a key={p.id} href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden bg-sand" aria-label={`${p.name} on Instagram`}>
              <Image src={p.image!} alt={p.imageAlt} fill sizes="(min-width: 768px) 16vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <span className="absolute inset-0 flex items-center justify-center bg-charcoal/0 text-ivory opacity-0 transition-all group-hover:bg-charcoal/35 group-hover:opacity-100">
                <InstagramIcon size={24} />
              </span>
            </a>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-8 py-4">
            <InstagramIcon size={16} /> Follow @feathers_the_2ndskin_
          </a>
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="container-x pt-16 md:pt-24">
        <div className="flex flex-col items-center gap-5 border border-line bg-white px-6 py-10 text-center md:flex-row md:justify-between md:px-12 md:text-left">
          <div>
            <h2 className="text-[28px] md:text-[34px]">Prefer to order on WhatsApp?</h2>
            <p className="mt-1 text-muted">Send us a product screenshot or ask about sizes — we reply quickly.</p>
          </div>
          <a href={waLink(config.whatsappNumber, `Hi ${config.businessName}, I would like to place an order.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp shrink-0 px-8 py-4">
            <WhatsAppIcon size={18} /> Chat on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
