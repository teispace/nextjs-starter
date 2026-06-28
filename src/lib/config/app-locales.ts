import type { AppLocale, LocaleDirection, SupportedLocale } from '@/types/i18n';

export const appLocales: AppLocale[] = [
  {
    name: 'English',
    locale: 'en',
    flag: '🇺🇸',
    country: 'United States',
    ogLocale: 'en_US',
  },
];

export function getLocaleDirection(locale: SupportedLocale | string): LocaleDirection {
  return appLocales.find((l) => l.locale === locale)?.dir ?? 'ltr';
}
