import { Breadcrumbs } from '@/components/store/seo';
import { publicConfig } from '@/server/config';

export function InfoPage({ title, eyebrow, path, updated, children }: { title: string; eyebrow?: string; path: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl py-10 md:py-14">
      <Breadcrumbs appUrl={publicConfig().appUrl} crumbs={[{ name: 'Home', href: '/' }, { name: title, href: path }]} />
      {eyebrow && <p className="eyebrow mt-8">{eyebrow}</p>}
      <h1 className={`${eyebrow ? 'mt-2' : 'mt-8'} text-[40px] leading-tight md:text-[54px]`}>{title}</h1>
      {updated && <p className="mt-2 text-[13px] text-muted">Last updated {updated}</p>}
      <div className="prose-store mt-6">{children}</div>
    </div>
  );
}
