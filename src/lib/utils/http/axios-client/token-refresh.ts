import type { AxiosInstance } from 'axios';

import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { AppApis } from '@/lib/config/app-apis';
import { logger } from '@/lib/logger';
import type { RefreshTokensResponse, TokenStore } from '@/types';

/**
 * Rotate the access/refresh token pair via `POST /auth/refresh`.
 *
 * Companion of the fetch-client variant. Cookie-mode (default): refresh
 * token rides the `refresh` HttpOnly cookie via `withCredentials`.
 * Bearer-mode (`SAVE_AUTH_TOKENS=true`): the stored refresh token is sent
 * as Bearer.
 *
 * Expected response shape (adjust `RefreshTokensResponse` to match your API):
 *   { accessToken, refreshToken, expiresIn, sessionId }
 * wrapped in the standard `{ data: ... }` envelope.
 */
export async function refreshAuthToken(
  tokenStore: TokenStore,
  axiosInstance: AxiosInstance,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};

    if (SAVE_AUTH_TOKENS) {
      const currentRefreshToken = await tokenStore.getRefreshToken();
      if (currentRefreshToken) {
        headers.Authorization = `Bearer ${currentRefreshToken}`;
      }
    }

    const res = await axiosInstance.post<{ data: RefreshTokensResponse }>(
      AppApis.auth.refresh,
      {},
      {
        _skipAuthInterceptor: true,
        headers,
      },
    );

    const { accessToken, refreshToken } = res.data.data;

    if (SAVE_AUTH_TOKENS) {
      await tokenStore.saveAccessToken(accessToken);
      await tokenStore.saveRefreshToken(refreshToken);
    }

    return accessToken;
  } catch (error) {
    logger.error({ err: error }, 'Token refresh failed');
    return null;
  }
}
