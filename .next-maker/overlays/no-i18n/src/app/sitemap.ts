import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

const APP_URL = env.NEXT_PUBLIC_APP_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/'];

  return paths.map((path) => ({
    url: `${APP_URL}${path}`,
    // No `lastModified`: `new Date()` is request-time work and would make
    // the sitemap render dynamically under Cache Components. Set it from
    // real content timestamps when pages come from a CMS or database.
    changeFrequency: 'monthly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));
}
