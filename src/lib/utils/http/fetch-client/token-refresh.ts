import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { AppApis } from '@/lib/config/app-apis';
import { logger } from '@/lib/logger';
import { type AuthTokens, right, type TokenStore } from '@/types';

export async function refreshAuthToken(
  tokenStore: TokenStore,
  baseURL: string,
): Promise<string | null> {
  try {
    const currentRefreshToken = await tokenStore.getRefreshToken();
    const refreshURL = `${baseURL}${AppApis.auth.refreshToken}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (currentRefreshToken) {
      headers.Authorization = `Bearer ${currentRefreshToken}`;
    }

    const response = await fetch(refreshURL, {
      method: 'POST',
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Token refresh failed');
      return null;
    }

    const data = await response.json();

    const result = right(data.data as AuthTokens);

    return result.fold(
      () => {
        return null;
      },
      async ({ access, refresh }) => {
        if (SAVE_AUTH_TOKENS) {
          await tokenStore.saveAccessToken(access);
          await tokenStore.saveRefreshToken(refresh);
        }

        return access;
      },
    );
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
