import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { env } from '@/lib/env';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // Fall back to the operator-configured DEFAULT_LOCALE when it's a supported
  // locale, otherwise to the routing default — so the env knob actually takes
  // effect instead of being silently ignored.
  const fallback = hasLocale(routing.locales, env.DEFAULT_LOCALE)
    ? env.DEFAULT_LOCALE
    : routing.defaultLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : fallback;

  return {
    locale,
    timeZone: env.DEFAULT_TIMEZONE,
    messages: (await import(`./translations/${locale}.json`)).default,
  };
});
