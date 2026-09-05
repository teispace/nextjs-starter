import type { Metadata } from 'next';

import { env } from '@/lib/env';

const APP_URL = env.NEXT_PUBLIC_APP_URL;
const APP_NAME = 'Nextjs Starter';
const APP_DESCRIPTION = 'Starter template for Next.js projects with TypeScript and Tailwind CSS';
/** Mirrors `--color-light` / `--color-dark` in `src/styles/globals.css`. */
const THEME_COLORS = { light: '#f5f5f5', dark: '#202938' } as const;
/** Served by `src/app/opengraph-image.tsx`; relative so `metadataBase` resolves it. */
const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';

type SEOParams = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

export function generateSEOMetadata({
  title,
  description,
  path = '',
  image,
  noIndex = false,
}: SEOParams): Metadata {
  const url = `${APP_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE_PATH;
  const images = [{ url: ogImage, width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    metadataBase: new URL(APP_URL),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: APP_NAME,
      images,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large' as const,
          'max-snippet': -1,
        },
  };
}

export { APP_DESCRIPTION, APP_NAME, APP_URL, DEFAULT_OG_IMAGE_PATH, THEME_COLORS };
