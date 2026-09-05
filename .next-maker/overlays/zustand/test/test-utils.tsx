import type { ReactElement, ReactNode } from 'react';

// @next-maker:i18n
import { NextIntlClientProvider } from 'next-intl';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';

import { type AppState, type AppStore, makeStore } from '@/store';
import { StoreContext } from '@/store/hooks';
// @next-maker:i18n
import type { SupportedLocale } from '@/types/i18n';

type TestProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  store?: AppStore;
  preloadedState?: Partial<AppState>;
  /* @next-maker:i18n:start */
  messages?: Record<string, unknown>;
  locale?: SupportedLocale;
  /* @next-maker:i18n:end */
};

/** A query client that never retries and drops its cache between tests. */
export const makeTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });

export function TestProviders({
  children,
  queryClient,
  store,
  preloadedState,
  /* @next-maker:i18n:start */
  messages = {},
  locale = 'en',
  /* @next-maker:i18n:end */
}: TestProvidersProps) {
  const testStore = store ?? makeStore(preloadedState);
  const testQueryClient = queryClient ?? makeTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <StoreContext.Provider value={testStore}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          {children}
        </NextIntlClientProvider>
      </StoreContext.Provider>
    </QueryClientProvider>
  );
}

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & Omit<TestProvidersProps, 'children'>;

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient,
    store,
    preloadedState,
    /* @next-maker:i18n:start */
    messages,
    locale,
    /* @next-maker:i18n:end */
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  const testStore = store ?? makeStore(preloadedState);
  const testQueryClient = queryClient ?? makeTestQueryClient();
  const providerProps = {
    queryClient: testQueryClient,
    store: testStore,
    /* @next-maker:i18n:start */
    messages,
    locale,
    /* @next-maker:i18n:end */
  };

  return {
    store: testStore,
    queryClient: testQueryClient,
    ...render(ui, {
      wrapper: ({ children }) => <TestProviders {...providerProps}>{children}</TestProviders>,
      ...renderOptions,
    }),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
