import { SAVE_AUTH_TOKENS } from '@/lib/config';
import { AppApis } from '@/lib/config/app-apis';
import { AuthTokens, right, TokenStore } from '@/types';
import { AxiosInstance } from 'axios';

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

    const response = right(res.data.data);

    return response.fold(
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Token refresh failed:', error);
    }
    return null;
  }
}
