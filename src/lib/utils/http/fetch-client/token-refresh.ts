import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { AppApis } from '@/lib/config/app-apis';
import { logger } from '@/lib/logger';
import type { RefreshTokensResponse, TokenStore } from '@/types';

import { generateRequestId, REQUEST_ID_HEADER } from '../shared';

/**
 * Call `POST /auth/refresh` to rotate the access/refresh token pair.
 *
 * Cookie-mode (default, `SAVE_AUTH_TOKENS=false`): the refresh token rides
 * the `refresh` HttpOnly cookie set at login; we just need `credentials:
 * 'include'`. Bearer-mode (`SAVE_AUTH_TOKENS=true`): we additionally send
 * the stored refresh token as a Bearer header for non-browser callers.
 *
 * Expected response shape (adjust `RefreshTokensResponse` to match your API):
 *   { accessToken, refreshToken, expiresIn, sessionId }
 * wrapped in the standard `{ data: ... }` envelope.
 */
export async function refreshAuthToken(
  tokenStore: TokenStore,
  baseURL: string,
): Promise<string | null> {
  try {
    const refreshURL = `${baseURL}${AppApis.auth.refresh}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      [REQUEST_ID_HEADER]: generateRequestId(),
    };

    if (SAVE_AUTH_TOKENS) {
      const currentRefreshToken = await tokenStore.getRefreshToken();
      if (currentRefreshToken) {
        headers.Authorization = `Bearer ${currentRefreshToken}`;
      }
    }

    const response = await fetch(refreshURL, {
      method: 'POST',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Token refresh failed');
      return null;
    }

    const body = (await response.json()) as { data: RefreshTokensResponse };
    const { accessToken, refreshToken } = body.data;

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

export async function preemptiveTokenRefresh(
  tokenStore: TokenStore,
  baseURL: string,
): Promise<boolean> {
  const token = await refreshAuthToken(tokenStore, baseURL);
  return token !== null;
}
