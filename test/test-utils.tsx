import type { ReactElement, ReactNode } from 'react';

// @next-maker:i18n
import { NextIntlClientProvider } from 'next-intl';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
// @next-maker:state
import { Provider } from 'react-redux';

// @next-maker:state
import { type AppState, type AppStore, makeStore } from '@/store';
// @next-maker:i18n
import type { SupportedLocale } from '@/types/i18n';

type TestProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  /* @next-maker:state:start */
  store?: AppStore;
  preloadedState?: Partial<AppState>;
  /* @next-maker:state:end */
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

/**
 * Provider tree for RTL tests: TanStack Query, Redux (fresh store per test),
 * and next-intl. The theme provider is omitted; components read theme state
 * through CSS, not React.
 */
export function TestProviders({
  children,
  queryClient,
  /* @next-maker:state:start */
  store,
  preloadedState,
  /* @next-maker:state:end */
  /* @next-maker:i18n:start */
  messages = {},
  locale = 'en',
  /* @next-maker:i18n:end */
}: TestProvidersProps) {
  // @next-maker:state
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

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & Omit<TestProvidersProps, 'children'>;

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient,
    /* @next-maker:state:start */
    store,
    preloadedState,
    /* @next-maker:state:end */
    /* @next-maker:i18n:start */
    messages,
    locale,
    /* @next-maker:i18n:end */
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  // @next-maker:state
  const testStore = store ?? makeStore(preloadedState);
  const testQueryClient = queryClient ?? makeTestQueryClient();
  const providerProps = {
    queryClient: testQueryClient,
    // @next-maker:state
    store: testStore,
    /* @next-maker:i18n:start */
    messages,
    locale,
    /* @next-maker:i18n:end */
  };

  return {
    // @next-maker:state
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
