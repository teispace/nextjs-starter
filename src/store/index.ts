import { configureStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from 'redux-persist';

import { Environment } from '@/lib/enums';
import { env } from '@/lib/env';

import { rootReducer } from './rootReducer';

export type AppState = ReturnType<typeof rootReducer>;

export const makeStore = (preloadedState?: Partial<AppState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as AppState | undefined,
    devTools: env.NODE_ENV !== Environment.PRODUCTION,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
