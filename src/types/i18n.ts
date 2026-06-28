import type { routing } from '@/i18n/routing';
import type messages from '@/i18n/translations/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}

/**
 * Single source of truth for the supported locales. The runtime list in
 * `app-locales.ts` and `routing.locales` both derive from this, so a new locale
 * is added in exactly one place and TypeScript checks every `appLocales` entry.
 */
export const SUPPORTED_LOCALES = ['en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocaleDirection = 'ltr' | 'rtl';

export type AppLocale = {
  name: string;
  locale: SupportedLocale;
  country: string;
  flag: string;
  dir?: LocaleDirection;
  /** OpenGraph `lang_REGION` override (e.g. `en_US`); derived from the tag if omitted. */
  ogLocale?: string;
};
