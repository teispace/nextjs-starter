'use client';
import { useEffect, useRef } from 'react';

import { type AppState, type AppStore, makeStore } from '@/store';
import { StoreContext } from '@/store/hooks';

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

  // Rehydrate persisted state after mount so the first client render matches
  // the server render; `useAppHydrated` flips when this completes.
  useEffect(() => {
    void storeRef.current?.persist.rehydrate();
  }, []);

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};
