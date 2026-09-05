'use client';

import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';

import { QueryProvider } from '@/lib/query';
import type { AppState } from '@/store';
import type { SupportedLocale } from '@/types/i18n';

import { StoreProvider } from './StoreProvider';

type RootProviderProps = {
  children: React.ReactNode;
  locale: SupportedLocale;
  messages: AbstractIntlMessages;
  timeZone: string;
  preloadedState?: Partial<AppState>;
};

/**
 * Client-side providers. The theme provider is not here on purpose: it is
 * rendered from the server layout, next to the anti-flash script in `<head>`,
 * so the two stay in the same file and the same config.
 */
export const RootProvider = ({
  children,
  locale,
  messages,
  timeZone,
  preloadedState,
}: RootProviderProps) => {
  return (
    <QueryProvider>
      <StoreProvider preloadedState={preloadedState}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
          {children}
        </NextIntlClientProvider>
      </StoreProvider>
    </QueryProvider>
  );
};
