import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';

import { countPersistConfig, counterReducer as countReducer } from '@/features/counter/store';

import { wsReducer } from './slices/ws.slice';

/**
 * `ws` is intentionally NOT wrapped in `persistReducer` — connection state
 * is ephemeral, and rehydrating "connected: true" on first paint would lie
 * about the actual transport. The bridge dispatches the real status as
 * soon as the WS client mounts.
 */
export const rootReducer = combineReducers({
  count: persistReducer(countPersistConfig, countReducer),
  ws: wsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
