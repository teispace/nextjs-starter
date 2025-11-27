'use client';
import { makeStore } from '@/store';
import { Provider } from 'react-redux';
import { createPersistor } from '@/store/persistor';
import { PersistGate } from 'redux-persist/integration/react';
import { useMemo } from 'react';

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const store = useMemo(() => makeStore(), []);
  const persistor = useMemo(() => createPersistor(store), [store]);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        {children}
      </PersistGate>
    </Provider>
  );
};
