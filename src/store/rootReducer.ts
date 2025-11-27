import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import countReducer from './features/count/countSlice';
import { countPersistConfig } from './features/count/persistConfig';
export const rootReducer = combineReducers({
  count: persistReducer(countPersistConfig, countReducer),
});

export type RootState = ReturnType<typeof rootReducer>;
