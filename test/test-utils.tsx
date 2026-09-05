import type { ReactElement, ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import { Provider } from 'react-redux';

import { type AppState, type AppStore, makeStore } from '@/store';
import type { SupportedLocale } from '@/types/i18n';

type TestProvidersProps = {
  children: ReactNode;
  store?: AppStore;
  queryClient?: QueryClient;
  preloadedState?: Partial<AppState>;
  messages?: Record<string, unknown>;
  locale?: SupportedLocale;
};

/** A query client that never retries and drops its cache between tests. */
export const makeTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });

/**
 * Provider tree for RTL tests: TanStack Query, Redux (fresh store per test),
 * and next-intl. The theme provider is omitted; components read theme state
 * through CSS, not React.
 */
export function TestProviders({
  children,
  store,
  queryClient,
  preloadedState,
  messages = {},
  locale = 'en',
}: TestProvidersProps) {
  const testStore = store ?? makeStore(preloadedState);
  const testQueryClient = queryClient ?? makeTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <Provider store={testStore}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          {children}
        </NextIntlClientProvider>
      </Provider>
    </QueryClientProvider>
  );
}

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  store?: AppStore;
  queryClient?: QueryClient;
  preloadedState?: Partial<AppState>;
  messages?: Record<string, unknown>;
  locale?: SupportedLocale;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    store,
    queryClient,
    preloadedState,
    messages,
    locale,
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  const testStore = store ?? makeStore(preloadedState);
  const testQueryClient = queryClient ?? makeTestQueryClient();

  return {
    store: testStore,
    queryClient: testQueryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders
          store={testStore}
          queryClient={testQueryClient}
          messages={messages}
          locale={locale}
        >
          {children}
        </TestProviders>
      ),
      ...renderOptions,
    }),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
