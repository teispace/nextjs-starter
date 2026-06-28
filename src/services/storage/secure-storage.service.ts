import secureLocalStorage from 'react-secure-storage';

import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { logger } from '@/lib/logger';

const StorageKeys = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Defense in depth: persisting tokens to (obfuscated) local storage is a
 * development/test-only affordance. `SAVE_AUTH_TOKENS` already gates every
 * caller, so this should be unreachable in any deployed (cookie-mode)
 * environment — if it ever runs there, fail loudly rather than silently
 * exposing tokens to XSS.
 */
function assertBearerStorageAllowed(): void {
  if (!SAVE_AUTH_TOKENS) {
    throw new Error(
      '[secure-storage] Refusing to persist auth tokens in cookie-mode environments. ' +
        'Bearer/localStorage mode is dev/test-only; deployed environments must use HttpOnly cookies.',
    );
  }
}

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
    assertBearerStorageAllowed();
    secureLocalStorage.setItem(StorageKeys.ACCESS_TOKEN, token);
  },
  getRefreshToken: (): string | null => read(StorageKeys.REFRESH_TOKEN),
  saveRefreshToken: (token: string): void => {
    assertBearerStorageAllowed();
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
