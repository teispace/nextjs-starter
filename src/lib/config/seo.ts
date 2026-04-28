import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';

const APP_URL = env.NEXT_PUBLIC_APP_URL;
const APP_NAME = 'Nextjs Starter';

type SEOParams = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

function localizedUrl(path: string, locale: string): string {
  if (routing.localePrefix === 'never' || locale === routing.defaultLocale) {
    return `${APP_URL}${path}`;
  }
  return `${APP_URL}/${locale}${path}`;
}

function buildLanguageAlternates(path: string): Record<string, string> | undefined {
  if (routing.locales.length <= 1) return undefined;
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, localizedUrl(path, locale)]),
  );
  languages['x-default'] = localizedUrl(path, routing.defaultLocale);
  return languages;
}

export function generateSEOMetadata({
  title,
  description,
  path = '',
  image,
  noIndex = false,
}: SEOParams): Metadata {
  const url = localizedUrl(path, routing.defaultLocale);
  const ogImage = image || `${APP_URL}/og-image.png`;
  const languages = buildLanguageAlternates(path);

  return {
    title,
    description,
    metadataBase: new URL(APP_URL),
    alternates: {
      canonical: url,
      ...(languages && { languages }),
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: APP_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
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

export { APP_NAME, APP_URL };
