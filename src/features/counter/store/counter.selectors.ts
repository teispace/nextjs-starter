import type { RootState } from '@/store/rootReducer';

export const selectCountValue = (state: RootState) => state.count.value;
