'use client';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { CustomThemeProvider } from '@/providers';
import type { AppState } from '@/store';
import type { SupportedLocale } from '@/types/i18n';
import { StoreProvider } from './StoreProvider';

type RootProviderProps = {
  children: React.ReactNode;
  locale: SupportedLocale;
  messages: AbstractIntlMessages;
  preloadedState?: Partial<AppState>;
};

export const RootProvider = ({ children, locale, messages, preloadedState }: RootProviderProps) => {
  return (
    <StoreProvider preloadedState={preloadedState}>
      <CustomThemeProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </CustomThemeProvider>
    </StoreProvider>
  );
};
