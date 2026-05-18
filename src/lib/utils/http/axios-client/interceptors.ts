import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import { SAVE_AUTH_TOKENS } from '@/lib/config';
import type { CookieResolver, TokenStore } from '@/types';

import { generateRequestId, isValidRequestId, REQUEST_ID_HEADER } from '../shared';

function readHeaderInsensitive(
  headers: InternalAxiosRequestConfig['headers'],
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && typeof value === 'string') return value;
  }
  return undefined;
}

export function setupRequestInterceptor(
  axiosInstance: AxiosInstance,
  tokenStore: TokenStore,
  resolveCookie?: CookieResolver,
): void {
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Request-ID: stamp every outgoing request unless the caller supplied
      // a valid one. Matches REQUEST_ID_PATTERN so a server enforcing the
      // same pattern echoes the value back rather than rewriting it.
      const providedId = readHeaderInsensitive(config.headers, REQUEST_ID_HEADER);
      if (!(providedId && isValidRequestId(providedId))) {
        config.headers.set(REQUEST_ID_HEADER, generateRequestId());
      }

      // Cookie forwarding — only when the consumer wired in a resolver. The
      // universal client doesn't (the browser cookie jar handles cookies
      // natively via `withCredentials: true`); the server-only client does.
      if (resolveCookie && !readHeaderInsensitive(config.headers, 'cookie')) {
        const cookieHeader = await resolveCookie();
        if (cookieHeader) config.headers.set('Cookie', cookieHeader);
      }

      if (config._skipAuthInterceptor) {
        return config;
      }

      if (SAVE_AUTH_TOKENS) {
        const token = await tokenStore.getAccessToken();
        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }
      }

      return config;
    },
    (error) => Promise.reject(error),
  );
}

export function setupResponseInterceptor(
  axiosInstance: AxiosInstance,
  tokenStore: TokenStore,
  handleTokenRefresh: () => Promise<string | null>,
  onUnauthorized?: () => void,
): void {
  axiosInstance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig | undefined;

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest._skipAuthInterceptor
      ) {
        originalRequest._retry = true;

        const token = await handleTokenRefresh();

        if (!token) {
          await tokenStore.clear();
          onUnauthorized?.();
          return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;

        return axiosInstance(originalRequest);
      }

      return Promise.reject(error);
    },
  );
}
