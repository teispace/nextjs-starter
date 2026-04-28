import { createMigrate, type PersistConfig, type PersistedState } from 'redux-persist';
import storage from '@/store/storage';
import type { CounterState } from '../types/counter.types';

const COUNT_PERSIST_VERSION = 1;

const migrations = {
  // Bump COUNT_PERSIST_VERSION and add a migration here when CounterState's
  // shape changes. Receives the previously-persisted state, returns the new
  // shape. Returning `undefined` discards stale state.
  // 2: (state) => ({ ...state, newField: defaultValue }),
} satisfies Record<number, (state: PersistedState) => PersistedState>;

export const countPersistConfig: PersistConfig<CounterState> = {
  key: 'count',
  storage,
  version: COUNT_PERSIST_VERSION,
  whitelist: ['value'],
  migrate: createMigrate(migrations, { debug: false }),
};
