import { SecureStorageService } from '@/services/storage/secure-storage.service';
import type { TokenStore } from '@/types';

export const secureStorageTokenStore: TokenStore = {
  async getAccessToken() {
    return SecureStorageService.getAccessToken();
  },
  async saveAccessToken(token: string) {
    SecureStorageService.saveAccessToken(token);
  },
  async getRefreshToken() {
    return SecureStorageService.getRefreshToken();
  },
  async saveRefreshToken(token: string) {
    SecureStorageService.saveRefreshToken(token);
  },
  async clear() {
    SecureStorageService.logout();
  },
};
