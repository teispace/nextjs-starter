import type { PersistStorage } from './persistence';

/**
 * `localStorage`-backed persistence adapter that is safe to import on the
 * server: every method no-ops when `window` is absent, so a store created
 * during SSR never touches browser APIs and never throws.
 */
const hasWindow = (): boolean => typeof window !== 'undefined';

export const webStorage: PersistStorage = {
  getItem: (key) => (hasWindow() ? window.localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (hasWindow()) window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (hasWindow()) window.localStorage.removeItem(key);
  },
};

/** In-memory adapter for tests and for environments without web storage. */
export const memoryStorage = (): PersistStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
};
