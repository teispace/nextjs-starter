import { PersistConfig } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { CountState } from './countSlice';

export const countPersistConfig: PersistConfig<CountState> = {
  key: 'count',
  storage,
  whitelist: ['value'],
};
