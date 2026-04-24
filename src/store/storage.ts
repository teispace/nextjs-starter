import type { WebStorage } from 'redux-persist';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

const createNoopStorage = (): WebStorage => ({
  getItem: (_key) => Promise.resolve(null),
  setItem: (_key, _value) => Promise.resolve(),
  removeItem: (_key) => Promise.resolve(),
});

const storage: WebStorage =
  typeof window !== 'undefined' ? createWebStorage('local') : createNoopStorage();

export default storage;
