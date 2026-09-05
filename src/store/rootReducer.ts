import { combineSlices } from '@reduxjs/toolkit';

import { counterSlice } from '@/features/counter/store/counter.slice';

import { persistSlice } from './persistence';
// @next-maker:ws
import { wsSlice } from './slices/ws.slice';

/**
 * Root reducer built with `combineSlices` so feature slices can also be
 * injected lazily from code-split routes via `rootReducer.inject(slice)`.
 *
 * Persistence is declared per slice (see `features/counter/store/persist.ts`)
 * and applied in `makeStore`; the `ws` slice is transport state and is never
 * persisted. Rehydrating "connected: true" on first paint would lie about
 * the actual socket.
 */
export const rootReducer = combineSlices(
  counterSlice,
  // @next-maker:ws
  wsSlice,
  persistSlice,
);

export type RootState = ReturnType<typeof rootReducer>;
