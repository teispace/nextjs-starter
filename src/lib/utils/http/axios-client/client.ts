import { handleUnauthorizedRedirect } from '../client-utils';
import { secureStorageTokenStore } from '../token-store';
import { createAxiosClient } from './axios-client';

export const axiosClient = createAxiosClient({
  tokenStore: secureStorageTokenStore,
  onUnauthorized: handleUnauthorizedRedirect,
});
