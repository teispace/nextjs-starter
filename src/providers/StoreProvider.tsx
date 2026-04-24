'use client';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { makeStore } from '@/store';
import { createPersistor } from '@/store/persistor';

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
