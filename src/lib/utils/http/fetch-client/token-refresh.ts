import { AppApis } from '@/lib/config/app-apis';
import { logger } from '@/lib/logger';
import type { RefreshTokensResponse, TokenStore } from '@/types';

import { generateRequestId, REQUEST_ID_HEADER, rotateTokens } from '../shared';

/**
 * Call `POST /auth/refresh` to rotate the access/refresh token pair.
 *
 * The bearer-header / envelope / token-save logic lives in the shared
 * {@link rotateTokens}; this adapter supplies only the fetch transport.
 * Cookie-mode (default, `SAVE_AUTH_TOKENS=false`): the refresh token rides the
 * `refresh` HttpOnly cookie set at login; we just need `credentials: 'include'`.
 * Bearer-mode (`SAVE_AUTH_TOKENS=true`): the stored refresh token is sent as a
 * Bearer header for non-browser callers.
 */
export function refreshAuthToken(tokenStore: TokenStore, baseURL: string): Promise<string | null> {
  return rotateTokens(tokenStore, async (authHeaders) => {
    const response = await fetch(`${baseURL}${AppApis.auth.refresh}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [REQUEST_ID_HEADER]: generateRequestId(),
        ...authHeaders,
      },
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Token refresh failed');
      return null;
    }

    const body = (await response.json()) as { data: RefreshTokensResponse };
    return body.data;
  });
}
