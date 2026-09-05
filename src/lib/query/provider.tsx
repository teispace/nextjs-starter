'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from './client';

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  // `getQueryClient` is stable per tab, so no useState is needed and the
  // client survives Suspense boundaries that would remount a stateful wrapper.
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
};
