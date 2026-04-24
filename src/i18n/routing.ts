import { defineRouting } from 'next-intl/routing';
import { appLocales } from '@/lib/config/app-locales';

export const routing = defineRouting({
  locales: appLocales.map((locale) => locale.locale),
  defaultLocale: 'en',
  localePrefix: 'never',
});
