import { createSlice } from '@reduxjs/toolkit';
import type { CounterState } from '../types/counter.types';

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'count',
  initialState,
  reducers: {
    increment: (state: CounterState) => {
      state.value += 1;
    },
    decrement: (state: CounterState) => {
      state.value -= 1;
    },
    reset: (state: CounterState) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, reset } = counterSlice.actions;

export const counterReducer = counterSlice.reducer;
