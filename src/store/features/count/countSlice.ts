import { createSlice } from '@reduxjs/toolkit';

export interface CountState {
  value: number;
}

const initialState: CountState = {
  value: 0,
};

export const countSlice = createSlice({
  name: 'count',
  initialState,
  reducers: {
    increment: (state: CountState) => {
      state.value += 1;
    },
    decrement: (state: CountState) => {
      state.value -= 1;
    },
    reset: (state: CountState) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, reset } = countSlice.actions;

export default countSlice.reducer;
