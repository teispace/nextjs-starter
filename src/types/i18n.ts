import { routing } from '@/i18n/routing';
import type messages from '@/i18n/translations/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}

export type SupportedLocale = 'en';

export type AppLocale = {
  name: string;
  locale: SupportedLocale;
  country: string;
  flag: string;
};
