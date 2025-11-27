import { appLocales } from '@/lib/config/app-locales';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: appLocales.map((locale) => locale.locale),
  defaultLocale: 'en',
  localePrefix: 'never',
});
