import type { StateCreator } from 'zustand';

import type { CounterState } from '../types/counter.types';

export interface CounterSlice {
  count: CounterState;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

/**
 * Slice creator composed into the app store (`src/store/index.ts`). The
 * first type argument is left open so the slice does not depend on the full
 * `AppState`; the store fixes it when it spreads the slices together.
 */
// biome-ignore lint/suspicious/noExplicitAny: composed into the app store, whose full type is declared there
export const createCounterSlice: StateCreator<any, [], [], CounterSlice> = (set) => ({
  count: { value: 0 },
  increment: () => set((state: CounterSlice) => ({ count: { value: state.count.value + 1 } })),
  decrement: () => set((state: CounterSlice) => ({ count: { value: state.count.value - 1 } })),
  reset: () => set({ count: { value: 0 } }),
});
