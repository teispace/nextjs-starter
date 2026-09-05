import { definePersistence } from '@/store/persistence';

import type { CounterState } from '../types/counter.types';

const COUNT_PERSIST_VERSION = 1;

export const countPersistence = definePersistence<CounterState>({
  key: 'count',
  version: COUNT_PERSIST_VERSION,
  pick: ['value'],
  migrations: {
    // Bump COUNT_PERSIST_VERSION and add a step keyed by the new number when
    // CounterState's persisted shape changes. Each step receives the previous
    // version's data and returns the next; return `undefined` to discard.
    // 2: (previous) => ({ ...(previous as CounterState), newField: 0 }),
  },
});
