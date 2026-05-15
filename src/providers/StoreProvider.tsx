'use client';
import { useEffect, useRef } from 'react';

import { Provider } from 'react-redux';
import type { Persistor } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';

import { attachWsBridge, wsClient } from '@/lib/utils/ws';
import { type AppState, type AppStore, makeStore } from '@/store';
import { createPersistor } from '@/store/persistor';

type StoreProviderProps = {
  children: React.ReactNode;
  preloadedState?: Partial<AppState>;
};

export const StoreProvider = ({ children, preloadedState }: StoreProviderProps) => {
  const storeRef = useRef<AppStore | null>(null);
  const persistorRef = useRef<Persistor | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore(preloadedState);
    persistorRef.current = createPersistor(storeRef.current);
  }

  // Bridge the WS client's lifecycle into the Redux slice exactly once per
  // store instance. The bridge does not open a connection — that happens
  // lazily on first `useWsEvent` subscription or an explicit `connect()`.
  // Effect runs in the browser only, so the SSR boundary is safe.
  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    return attachWsBridge(wsClient, store.dispatch);
  }, []);

  return (
    <Provider store={storeRef.current}>
      <PersistGate persistor={persistorRef.current as Persistor} loading={children}>
        {children}
      </PersistGate>
    </Provider>
  );
};
