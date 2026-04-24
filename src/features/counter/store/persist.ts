import type { PersistConfig } from 'redux-persist';
import storage from '@/store/storage';
import type { CounterState } from '../types/counter.types';

export const countPersistConfig: PersistConfig<CounterState> = {
  key: 'count',
  storage,
  whitelist: ['value'],
};
