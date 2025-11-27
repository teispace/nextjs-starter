import { API_PREFIX } from './constants';

export const AppApis = {
  auth: {
    base: `${API_PREFIX}/auth`,
    refreshToken: `${API_PREFIX}/auth/refresh-token`,
  },
} as const;
