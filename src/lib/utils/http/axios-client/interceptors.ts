import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import { SAVE_AUTH_TOKENS } from '@/lib/config';
import type { TokenStore } from '@/types';

export function setupRequestInterceptor(
  axiosInstance: AxiosInstance,
  tokenStore: TokenStore,
): void {
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (config._skipAuthInterceptor) {
        return config;
      }

      if (SAVE_AUTH_TOKENS) {
        const token = await tokenStore.getAccessToken();

        if (token) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
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
      const originalRequest = error.config as AxiosRequestConfig;

      if (
        error.response?.status === 401 &&
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
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return axiosInstance(originalRequest);
      }

      return Promise.reject(error);
    },
  );
}
