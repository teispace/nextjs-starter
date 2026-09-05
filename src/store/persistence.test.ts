import { configureStore, createSlice } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPersistence,
  definePersistence,
  hydrationFinished,
  persistSlice,
} from './persistence';
import { memoryStorage } from './storage';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

interface CounterState {
  value: number;
  transient: string;
}

const counter = createSlice({
  name: 'count',
  initialState: { value: 0, transient: 'x' } as CounterState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    setTransient: (state, action: { payload: string }) => {
      state.transient = action.payload;
    },
  },
});

const makeHarness = (
  options: { version?: number; migrations?: Record<number, (p: unknown) => unknown> } = {},
) => {
  const storage = memoryStorage();
  const entry = definePersistence<CounterState>({
    key: 'count',
    version: options.version ?? 1,
    pick: ['value'],
    migrations: options.migrations,
  });
  const persistence = createPersistence({ storage, entries: [entry], prefix: 't', debounceMs: 50 });
  const root = (
    state: { count: CounterState; persist: { hydrated: boolean } } | undefined,
    action: never,
  ) => ({
    count: counter.reducer(state?.count, action),
    persist: persistSlice.reducer(state?.persist, action),
  });
  const store = configureStore({
    reducer: persistence.reducer(root as never),
    middleware: (gdm) => gdm().prepend(persistence.middleware),
  });
  return { storage, persistence, store };
};

describe('createPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes only the picked fields, once per burst, after the debounce', async () => {
    const { storage, store } = makeHarness();
    store.dispatch(counter.actions.increment());
    store.dispatch(counter.actions.increment());
    store.dispatch(counter.actions.setTransient('changed'));

    expect(storage.getItem('t:count')).toBeNull();
    await vi.advanceTimersByTimeAsync(60);

    expect(JSON.parse(storage.getItem('t:count') as string)).toEqual({ v: 1, data: { value: 2 } });
  });

  it('flush writes pending changes immediately, ahead of the debounce', async () => {
    const { storage, persistence, store } = makeHarness();
    store.dispatch(counter.actions.increment());
    expect(storage.getItem('t:count')).toBeNull();

    await persistence.flush();

    expect(JSON.parse(storage.getItem('t:count') as string)).toEqual({ v: 1, data: { value: 1 } });
    // The debounced write that follows finds nothing dirty and writes nothing new.
    storage.removeItem('t:count');
    await vi.advanceTimersByTimeAsync(60);
    expect(storage.getItem('t:count')).toBeNull();
  });

  it('rehydrates a stored slice over the initial state and flags hydration', async () => {
    const { storage, persistence, store } = makeHarness();
    storage.setItem('t:count', JSON.stringify({ v: 1, data: { value: 9 } }));

    await persistence.hydrate(store.dispatch);

    expect(store.getState().count).toEqual({ value: 9, transient: 'x' });
    expect(store.getState().persist.hydrated).toBe(true);
  });

  it('migrates forward one version at a time', async () => {
    const { storage, persistence, store } = makeHarness({
      version: 3,
      migrations: {
        2: (p) => ({ ...(p as object), value: (p as { count: number }).count }),
        3: (p) => ({ ...(p as object), value: (p as { value: number }).value * 10 }),
      },
    });
    storage.setItem('t:count', JSON.stringify({ v: 1, data: { count: 4 } }));

    await persistence.hydrate(store.dispatch);

    expect(store.getState().count.value).toBe(40);
  });

  it('discards a payload from a newer version or one with a missing migration', async () => {
    const { storage, persistence, store } = makeHarness({ version: 2 });
    storage.setItem('t:count', JSON.stringify({ v: 5, data: { value: 1 } }));

    await persistence.hydrate(store.dispatch);

    expect(store.getState().count.value).toBe(0);
    expect(storage.getItem('t:count')).toBeNull();
  });

  it('ignores corrupt storage and still finishes hydration', async () => {
    const { storage, persistence, store } = makeHarness();
    storage.setItem('t:count', '{not json');

    await persistence.hydrate(store.dispatch);

    expect(store.getState().count.value).toBe(0);
    expect(store.getState().persist.hydrated).toBe(true);
  });

  it('purge removes every persisted key', async () => {
    const { storage, persistence } = makeHarness();
    storage.setItem('t:count', '{"v":1,"data":{"value":1}}');
    await persistence.purge();
    expect(storage.getItem('t:count')).toBeNull();
  });

  it('exposes the hydrationFinished action for consumers that need to react to it', () => {
    expect(hydrationFinished.type).toBe('persist/hydrationFinished');
  });
});
