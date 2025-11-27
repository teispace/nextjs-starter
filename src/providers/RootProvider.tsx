'use client';
import { CustomThemeProvider, StoreProvider } from '@/providers';
import { SupportedLocale } from '@/types/i18n';
import { NextIntlClientProvider } from 'next-intl';
import { AbstractIntlMessages } from 'next-intl';

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
