import type { AxiosInstance } from 'axios';
import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { AppApis } from '@/lib/config/app-apis';
import { logger } from '@/lib/logger';
import type { AuthTokens, TokenStore } from '@/types';

export async function refreshAuthToken(
  tokenStore: TokenStore,
  axiosInstance: AxiosInstance,
): Promise<string | null> {
  try {
    const currentRefreshToken = await tokenStore.getRefreshToken();

    const res = await axiosInstance.post<{ data: AuthTokens }>(
      AppApis.auth.refreshToken,
      {},
      {
        _skipAuthInterceptor: true,
        headers: currentRefreshToken
          ? {
              Authorization: `Bearer ${currentRefreshToken}`,
            }
          : undefined,
      },
    );

    const { access, refresh } = res.data.data;

    if (SAVE_AUTH_TOKENS) {
      await tokenStore.saveAccessToken(access);
      await tokenStore.saveRefreshToken(refresh);
    }

    return access;
  } catch (error) {
    logger.error({ err: error }, 'Token refresh failed');
    return null;
  }
}
