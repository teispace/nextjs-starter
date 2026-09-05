import type { Metadata } from 'next';

import { routing } from '@/i18n/routing';
import { appLocales } from '@/lib/config/app-locales';
import { env } from '@/lib/env';
import type { SupportedLocale } from '@/types/i18n';

const APP_URL = env.NEXT_PUBLIC_APP_URL;
const APP_NAME = 'Nextjs Starter';
const APP_DESCRIPTION = 'Starter template for Next.js projects with TypeScript and Tailwind CSS';
/** Mirrors `--color-light` / `--color-dark` in `src/styles/globals.css`. */
const THEME_COLORS = { light: '#f5f5f5', dark: '#202938' } as const;
/** Served by `src/app/[locale]/opengraph-image.tsx` via the locale rewrite; relative so `metadataBase` resolves it. */
const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';

type SEOParams = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  locale?: SupportedLocale;
};

function localizedUrl(path: string, locale: string): string {
  if (routing.localePrefix === 'never' || locale === routing.defaultLocale) {
    return `${APP_URL}${path}`;
  }
  return `${APP_URL}/${locale}${path}`;
}

/** Normalize a BCP-47 locale tag to OpenGraph's `lang_REGION` form (e.g. en → en_US). */
function toOpenGraphLocale(locale: string): string {
  const configured = appLocales.find((l) => l.locale === locale)?.ogLocale;
  if (configured) return configured;
  const [lang, region] = locale.split('-');
  return region ? `${lang}_${region.toUpperCase()}` : lang;
}

function buildLanguageAlternates(path: string): Record<string, string> | undefined {
  // hreflang is meaningless when every locale resolves to the same unprefixed
  // URL, which is exactly what localePrefix: 'never' produces.
  if (routing.localePrefix === 'never' || routing.locales.length <= 1) return undefined;
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
  locale = routing.defaultLocale,
}: SEOParams): Metadata {
  const url = localizedUrl(path, locale);
  const languages = buildLanguageAlternates(path);
  // The default card is referenced explicitly rather than left to the file
  // convention: with `localePrefix: 'never'` the convention would emit the
  // prefixed `/en/opengraph-image`, which the proxy redirects. The unprefixed
  // path is rewritten to the active locale's image instead.
  const ogImage = image ?? DEFAULT_OG_IMAGE_PATH;
  const images = [{ url: ogImage, width: 1200, height: 630, alt: title }];

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
      images,
      locale: toOpenGraphLocale(locale),
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
