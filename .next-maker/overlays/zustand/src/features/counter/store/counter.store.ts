import type { StateCreator } from 'zustand';

import type { CounterState } from '../types/counter.types';

export interface CounterSlice {
  count: CounterState;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// biome-ignore lint/suspicious/noExplicitAny: the slice creator is composed into the app store, whose full type is declared there
export const createCounterSlice: StateCreator<any, [], [], CounterSlice> = (set) => ({
  count: { value: 0 },
  increment: () =>
    set(
      (state: CounterSlice) => ({ count: { value: state.count.value + 1 } }),
      false,
      'count/increment',
    ),
  decrement: () =>
    set(
      (state: CounterSlice) => ({ count: { value: state.count.value - 1 } }),
      false,
      'count/decrement',
    ),
  reset: () => set({ count: { value: 0 } }, false, 'count/reset'),
});
