import { configureStore } from '@reduxjs/toolkit';

import { countPersistence } from '@/features/counter/store/persist';
import { Environment } from '@/lib/enums';
import { env } from '@/lib/env';

import { createPersistence } from './persistence';
import { rootReducer } from './rootReducer';
import { webStorage } from './storage';

export type AppState = ReturnType<typeof rootReducer>;

/**
 * One persistence instance per process: it owns the listener middleware and
 * the storage keys. Register a new persisted slice by adding its entry here.
 */
export const persistence = createPersistence({
  storage: webStorage,
  entries: [countPersistence],
  prefix: 'app',
});

export const makeStore = (preloadedState?: Partial<AppState>) => {
  return configureStore({
    reducer: persistence.reducer(rootReducer),
    preloadedState: preloadedState as AppState | undefined,
    devTools: env.NODE_ENV !== Environment.PRODUCTION,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(persistence.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
