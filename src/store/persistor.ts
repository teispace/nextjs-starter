import { persistStore } from 'redux-persist';
import type { AppStore } from './index';

export const createPersistor = (store: AppStore) => {
  return persistStore(store);
};
