import type { MetadataRoute } from 'next';
import { storeConfig } from '@/server/config';

export default function robots(): MetadataRoute.Robots {
  const base = storeConfig().appUrl;
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cart', '/checkout', '/order/', '/pay/', '/account', '/track'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
