import secureLocalStorage from 'react-secure-storage';

import { logger } from '@/lib/logger';

const StorageKeys = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const read = (key: string): string | null => {
  try {
    return secureLocalStorage.getItem(key) as string | null;
  } catch {
    return null;
  }
};

export const SecureStorageService = {
  getAccessToken: (): string | null => read(StorageKeys.ACCESS_TOKEN),
  saveAccessToken: (token: string): void => {
    secureLocalStorage.setItem(StorageKeys.ACCESS_TOKEN, token);
  },
  getRefreshToken: (): string | null => read(StorageKeys.REFRESH_TOKEN),
  saveRefreshToken: (token: string): void => {
    secureLocalStorage.setItem(StorageKeys.REFRESH_TOKEN, token);
  },
  logout: (): void => {
    try {
      secureLocalStorage.removeItem(StorageKeys.ACCESS_TOKEN);
      secureLocalStorage.removeItem(StorageKeys.REFRESH_TOKEN);
    } catch {
      logger.debug('Failed to clear secure storage during logout');
    }
  },
};
