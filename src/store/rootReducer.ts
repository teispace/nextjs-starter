import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import { counterReducer as countReducer, countPersistConfig } from '@/features/counter/store';

export const rootReducer = combineReducers({
  count: persistReducer(countPersistConfig, countReducer),
});

export type RootState = ReturnType<typeof rootReducer>;
