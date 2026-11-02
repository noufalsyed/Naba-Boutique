import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { MobileChrome } from '@/components/store/mobile-chrome';
import { StoreProvider } from '@/components/store/store-provider';
import { JsonLd, organizationLd } from '@/components/store/seo';
import { publicConfig } from '@/server/config';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const config = publicConfig();
  return (
    <StoreProvider config={config}>
      <JsonLd data={organizationLd(config)} />
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer config={config} />
      <MobileChrome />
    </StoreProvider>
  );
}
