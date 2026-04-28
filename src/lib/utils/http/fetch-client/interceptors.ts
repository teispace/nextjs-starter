import { SAVE_AUTH_TOKENS } from '@/lib/config';
import type { ExtendedRequestInit, InterceptorResult, TokenStore } from '@/types';

export async function applyRequestInterceptors(
  options: ExtendedRequestInit,
  tokenStore: TokenStore,
  defaultOptions: RequestInit,
): Promise<RequestInit> {
  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  if (options._skipAuthInterceptor) {
    return mergedOptions;
  }

  // Token attached directly by a retry takes precedence over any stored token,
  // since SAVE_AUTH_TOKENS may be false (cookie-based auth) but the refresh
  // endpoint still returns a fresh access token we need to forward.
  const directToken = options._authToken;
  const token = directToken ?? (SAVE_AUTH_TOKENS ? await tokenStore.getAccessToken() : null);

  if (token) {
    mergedOptions.headers = {
      ...mergedOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return mergedOptions;
}

export async function applyResponseInterceptors(
  response: Response,
  _responseData: unknown,
  originalOptions: ExtendedRequestInit,
  tokenStore: TokenStore,
  handleTokenRefresh: () => Promise<string | null>,
  onUnauthorized?: () => void,
): Promise<InterceptorResult> {
  if (response.status !== 401 || originalOptions._retry || originalOptions._skipAuthInterceptor) {
    return {
      shouldRetry: false,
      shouldReject: false,
    };
  }

  const newToken = await handleTokenRefresh();

  if (!newToken) {
    await tokenStore.clear();
    onUnauthorized?.();

    return {
      shouldRetry: false,
      shouldReject: true,
    };
  }

  return {
    shouldRetry: true,
    shouldReject: false,
    newToken,
  };
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isEdgeRuntime(): boolean {
  // @ts-expect-error - EdgeRuntime global is not in standard types
  return typeof EdgeRuntime !== 'undefined';
}
