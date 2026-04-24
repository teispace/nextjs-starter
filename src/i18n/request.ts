import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { env } from '@/lib/env';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: env.DEFAULT_TIMEZONE,
    messages: (await import(`./translations/${locale}.json`)).default,
  };
});
