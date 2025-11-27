import secureLocalStorage from 'react-secure-storage';

const StorageKeys = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export class SecureStorageService {
  static getAccessToken(): string | null {
    try {
      return secureLocalStorage.getItem(StorageKeys.ACCESS_TOKEN) as string | null;
    } catch {
      return null;
    }
  }

  static saveAccessToken(token: string): void {
    secureLocalStorage.setItem(StorageKeys.ACCESS_TOKEN, token);
  }

  static getRefreshToken(): string | null {
    try {
      return secureLocalStorage.getItem(StorageKeys.REFRESH_TOKEN) as string | null;
    } catch {
      return null;
    }
  }

  static saveRefreshToken(token: string): void {
    secureLocalStorage.setItem(StorageKeys.REFRESH_TOKEN, token);
  }

  static logout(): void {
    try {
      secureLocalStorage.removeItem(StorageKeys.ACCESS_TOKEN);
      secureLocalStorage.removeItem(StorageKeys.REFRESH_TOKEN);
    } catch {}
  }
}
