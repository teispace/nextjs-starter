import { secureStorageTokenStore } from '../token-store';
import { handleUnauthorizedRedirect } from '../client-utils';
import { createFetchClient } from './fetch-client';

export const fetchClient = createFetchClient({
  tokenStore: secureStorageTokenStore,
  onUnauthorized: handleUnauthorizedRedirect,
  cache: 'no-store',
});
