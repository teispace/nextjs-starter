import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';

const APP_URL = env.NEXT_PUBLIC_APP_URL;

function localizedUrl(path: string, locale: string): string {
  if (routing.localePrefix === 'never' || locale === routing.defaultLocale) {
    return `${APP_URL}${path}`;
  }
  return `${APP_URL}/${locale}${path}`;
}

function buildAlternates(path: string): Record<string, string> | undefined {
  if (routing.locales.length <= 1) return undefined;
  return Object.fromEntries(routing.locales.map((locale) => [locale, localizedUrl(path, locale)]));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/'];

  return paths.map((path) => {
    const languages = buildAlternates(path);
    return {
      url: localizedUrl(path, routing.defaultLocale),
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: path === '/' ? 1 : 0.8,
      alternates: languages ? { languages } : undefined,
    };
  });
}
