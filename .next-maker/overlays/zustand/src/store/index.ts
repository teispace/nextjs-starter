import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { type CounterSlice, createCounterSlice } from '@/features/counter/store/counter.store';
import { Environment } from '@/lib/enums';
import { env } from '@/lib/env';

/**
 * Application store built from feature slices (the "slices pattern"). Each
 * feature exports a `create<Name>Slice` creator; add it here and to
 * `AppState`. One store is created per request on the server and per tab in
 * the browser by `StoreProvider`; nothing is module-global.
 *
 * Persistence: `partialize` picks the fields that survive reloads,
 * `version` + `migrate` evolve their shape, and `skipHydration` keeps the
 * first client render identical to the server render. `StoreProvider`
 * rehydrates after mount and `useAppHydrated` tells components when the
 * persisted values are in.
 */
export type AppState = CounterSlice & {
  hydrated: boolean;
  setHydrated: () => void;
};

export type PersistedState = Pick<AppState, 'count'>;

const PERSIST_VERSION = 1;

const migrate = (persisted: unknown, version: number): PersistedState => {
  // Add one `if (version < N)` block per bump, transforming the previous
  // shape into the next. Unknown shapes fall back to the defaults.
  if (version < 1 || typeof persisted !== 'object' || persisted === null) {
    return { count: { value: 0 } };
  }
  return persisted as PersistedState;
};

export const makeStore = (preloadedState?: Partial<AppState>) =>
  createStore<AppState>()(
    devtools(
      persist(
        (set, get, api) => ({
          ...createCounterSlice(set, get, api),
          hydrated: false,
          setHydrated: () => set({ hydrated: true }, false, 'persist/hydrated'),
          ...preloadedState,
        }),
        {
          name: 'app',
          version: PERSIST_VERSION,
          storage: createJSONStorage(() => localStorage),
          partialize: (state): PersistedState => ({ count: state.count }),
          migrate,
          skipHydration: true,
          onRehydrateStorage: () => (state) => state?.setHydrated(),
        },
      ),
      { enabled: env.NODE_ENV !== Environment.PRODUCTION, name: 'app' },
    ),
  );

export type AppStore = ReturnType<typeof makeStore>;
