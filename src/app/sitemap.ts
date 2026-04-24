import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

const APP_URL = env.NEXT_PUBLIC_APP_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
