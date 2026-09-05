'use client';
import { useEffect, useRef } from 'react';

import { Provider } from 'react-redux';

import { attachWsBridge, wsClient } from '@/lib/ws';
import { type AppState, type AppStore, makeStore, persistence } from '@/store';

type StoreProviderProps = {
  children: React.ReactNode;
  preloadedState?: Partial<AppState>;
};

export const StoreProvider = ({ children, preloadedState }: StoreProviderProps) => {
  // One store per mount (one per request on the server), created lazily so
  // React Strict Mode's double render cannot build two.
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore(preloadedState);
  }

  // Client-only work, once per store instance: rehydrate persisted slices
  // and bridge the WS client's lifecycle into the Redux slice. The bridge does
  // not open a connection — that happens lazily on the first `useWsEvent`
  // subscription or an explicit `connect()`.
  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    void persistence.hydrate(store.dispatch);
    return attachWsBridge(wsClient, store.dispatch);
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
};
