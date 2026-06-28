import type { AxiosInstance } from 'axios';

import { AppApis } from '@/lib/config/app-apis';
import type { RefreshTokensResponse, TokenStore } from '@/types';

import { rotateTokens } from '../shared';

/**
 * Rotate the access/refresh token pair via `POST /auth/refresh`.
 *
 * Companion of the fetch-client variant. The bearer-header / envelope /
 * token-save logic lives in the shared {@link rotateTokens}; this adapter
 * supplies only the axios transport. Cookie-mode (default): the refresh token
 * rides the `refresh` HttpOnly cookie via `withCredentials`. Bearer-mode
 * (`SAVE_AUTH_TOKENS=true`): the stored refresh token is sent as Bearer.
 */
export function refreshAuthToken(
  tokenStore: TokenStore,
  axiosInstance: AxiosInstance,
): Promise<string | null> {
  return rotateTokens(tokenStore, async (headers) => {
    const res = await axiosInstance.post<{ data: RefreshTokensResponse }>(
      AppApis.auth.refresh,
      {},
      {
        _skipAuthInterceptor: true,
        headers,
      },
    );
    return res.data.data;
  });
}
