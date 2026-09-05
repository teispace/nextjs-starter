'use client';

import { createContext, useContext } from 'react';

import { useStore } from 'zustand';

import type { AppState, AppStore } from './index';

export const StoreContext = createContext<AppStore | null>(null);

/** Read a slice of state with a selector; re-renders only when the selection changes. */
export const useAppStore = <T>(selector: (state: AppState) => T): T => {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStore must be used inside <StoreProvider>');
  return useStore(store, selector);
};

/** The store instance itself, for imperative reads (`getState`) and subscriptions. */
export const useAppStoreApi = (): AppStore => {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStoreApi must be used inside <StoreProvider>');
  return store;
};

/** True once persisted state has been rehydrated on the client. */
export const useAppHydrated = (): boolean => useAppStore((state) => state.hydrated);
