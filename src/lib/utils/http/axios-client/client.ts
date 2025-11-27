import { createAxiosClient } from './axios-client';
import { secureStorageTokenStore } from '../token-store';
import { handleUnauthorizedRedirect } from '../client-utils';

export const axiosClient = createAxiosClient({
  tokenStore: secureStorageTokenStore,
  onUnauthorized: handleUnauthorizedRedirect,
});
