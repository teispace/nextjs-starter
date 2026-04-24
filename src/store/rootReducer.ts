import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import { countPersistConfig, counterReducer as countReducer } from '@/features/counter/store';

export const rootReducer = combineReducers({
  count: persistReducer(countPersistConfig, countReducer),
});

export type RootState = ReturnType<typeof rootReducer>;
