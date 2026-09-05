import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { env } from '@/lib/env';

import { formats } from './formats';
import { routing } from './routing';

/**
 * Per-request i18n configuration.
 *
 * The locale comes from the `[locale]` root param (Next 16.3
 * `next/root-params`), which is readable inside `use cache` scopes, so this
 * no longer needs `setRequestLocale` in every layout and page. An explicit
 * `locale` passed to `getTranslations({ locale })` wins; an unsupported
 * segment value is a 404; no segment at all (a route outside `[locale]`)
 * falls back to the operator-configured default.
 */
export default getRequestConfig(async ({ locale: explicit }) => {
  const requested = explicit ?? (await rootLocale());

  let locale: (typeof routing.locales)[number];
  if (requested === undefined) {
    locale = hasLocale(routing.locales, env.DEFAULT_LOCALE)
      ? env.DEFAULT_LOCALE
      : routing.defaultLocale;
  } else if (hasLocale(routing.locales, requested)) {
    locale = requested;
  } else {
    notFound();
  }

  return {
    locale,
    timeZone: env.DEFAULT_TIMEZONE,
    formats,
    messages: (await import(`./translations/${locale}.json`)).default,
  };
});
