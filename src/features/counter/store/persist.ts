import type { PersistConfig } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import type { CounterState } from '../types/counter.types';

export const countPersistConfig: PersistConfig<CounterState> = {
  key: 'count',
  storage,
  whitelist: ['value'],
};
