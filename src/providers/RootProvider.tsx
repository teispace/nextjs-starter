'use client';

// @next-maker:i18n
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';

import { QueryProvider } from '@/lib/query';
// @next-maker:state
import type { AppState } from '@/store';
// @next-maker:i18n
import type { SupportedLocale } from '@/types/i18n';

// @next-maker:state
import { StoreProvider } from './StoreProvider';

type RootProviderProps = {
  children: React.ReactNode;
  /* @next-maker:i18n:start */
  locale: SupportedLocale;
  messages: AbstractIntlMessages;
  timeZone: string;
  /* @next-maker:i18n:end */
  // @next-maker:state
  preloadedState?: Partial<AppState>;
};

/**
 * Client-side providers. The theme provider is not here on purpose: it is
 * rendered from the server layout, next to the anti-flash script in `<head>`,
 * so the two stay in the same file and the same config.
 *
 * The `@next-maker` comments are composition anchors read by the project
 * generator; they are inert here and removed from generated projects.
 */
export const RootProvider = ({
  children,
  /* @next-maker:i18n:start */
  locale,
  messages,
  timeZone,
  /* @next-maker:i18n:end */
  // @next-maker:state
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
