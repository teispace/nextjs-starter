import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { RefreshTokensResponse, TokenStore } from '@/types';

/**
 * Transport-agnostic core of `POST /auth/refresh`. Owns the bearer-header
 * build, the `{ data: ... }` envelope extraction, the dual token persist, and
 * the failure logging — everything the axios and fetch adapters had duplicated.
 * Each adapter supplies only its `doPost` transport closure.
 *
 * Cookie-mode (default, `SAVE_AUTH_TOKENS=false`): no bearer header; the refresh
 * token rides the `refresh` HttpOnly cookie. Bearer-mode (`true`): the stored
 * refresh token is sent as `Authorization: Bearer` and the rotated pair is
 * persisted to the token store.
 *
 * `doPost` returns the parsed `RefreshTokensResponse`, or `null` when the
 * transport itself decided the refresh failed (e.g. a non-2xx fetch response).
 * Any thrown error is caught here, logged, and surfaced as `null`.
 */
export async function rotateTokens(
  tokenStore: TokenStore,
  doPost: (headers: Record<string, string>) => Promise<RefreshTokensResponse | null>,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};

    if (SAVE_AUTH_TOKENS) {
      const currentRefreshToken = await tokenStore.getRefreshToken();
      if (currentRefreshToken) {
        headers.Authorization = `Bearer ${currentRefreshToken}`;
      }
    }

    const data = await doPost(headers);
    if (!data) return null;

    const { accessToken, refreshToken } = data;

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
