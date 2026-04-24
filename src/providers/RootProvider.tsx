'use client';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { CustomThemeProvider, StoreProvider } from '@/providers';
import type { SupportedLocale } from '@/types/i18n';

export const RootProvider = ({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: SupportedLocale;
  messages: AbstractIntlMessages;
}) => {
  return (
    <StoreProvider>
      <CustomThemeProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </CustomThemeProvider>
    </StoreProvider>
  );
};
