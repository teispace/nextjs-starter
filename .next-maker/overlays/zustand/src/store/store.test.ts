// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { makeStore } from './index';

describe('makeStore (zustand)', () => {
  beforeEach(() => localStorage.clear());

  it('starts from preloaded state and is not hydrated until asked', () => {
    const store = makeStore({ count: { value: 3 } });
    expect(store.getState().count.value).toBe(3);
    expect(store.getState().hydrated).toBe(false);
  });

  it('persists only the partialized fields and rehydrates them', async () => {
    const first = makeStore();
    first.getState().increment();
    first.getState().increment();
    const raw = localStorage.getItem('app');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}').state).toEqual({ count: { value: 2 } });

    const second = makeStore();
    expect(second.getState().count.value).toBe(0);
    await second.persist.rehydrate();
    expect(second.getState().count.value).toBe(2);
    expect(second.getState().hydrated).toBe(true);
  });

  it('migrates an unknown persisted shape back to defaults', async () => {
    localStorage.setItem('app', JSON.stringify({ state: 'garbage', version: 0 }));
    const store = makeStore();
    await store.persist.rehydrate();
    expect(store.getState().count.value).toBe(0);
  });
});
