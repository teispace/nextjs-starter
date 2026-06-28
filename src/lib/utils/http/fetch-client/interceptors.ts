import { SAVE_AUTH_TOKENS } from '@/lib/config';
import type { CookieResolver, ExtendedRequestInit, InterceptorResult, TokenStore } from '@/types';

import { generateRequestId, isValidRequestId, REQUEST_ID_HEADER } from '../shared';

function hasHeader(headers: HeadersInit | undefined, name: string): boolean {
  if (!headers) return false;
  const lower = name.toLowerCase();
  if (headers instanceof Headers) return headers.has(name);
  if (Array.isArray(headers)) return headers.some(([k]) => k.toLowerCase() === lower);
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

export async function applyRequestInterceptors(
  options: ExtendedRequestInit,
  tokenStore: TokenStore,
  defaultOptions: RequestInit,
  resolveCookie?: CookieResolver,
  attachAuth = true,
): Promise<RequestInit> {
  const mergedHeaders: Record<string, string> = {
    ...(defaultOptions.headers as Record<string, string> | undefined),
    ...(options.headers as Record<string, string> | undefined),
  };

  // Request-ID: send a fresh ID per call unless the caller supplied a valid one.
  // A well-behaved server echoes whatever we send back when it matches the pattern.
  const providedId =
    mergedHeaders[REQUEST_ID_HEADER] ?? mergedHeaders[REQUEST_ID_HEADER.toLowerCase()];
  if (!(providedId && isValidRequestId(providedId))) {
    mergedHeaders[REQUEST_ID_HEADER] = generateRequestId();
  }

  // Cookie forwarding — only when the consumer wired in a resolver. The
  // universal client doesn't (browser cookie jar handles it natively); the
  // server-only client does (it reads next/headers).
  if (resolveCookie && !hasHeader(mergedHeaders, 'cookie')) {
    const cookieHeader = await resolveCookie();
    if (cookieHeader) mergedHeaders.Cookie = cookieHeader;
  }

  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: mergedHeaders,
  };

  if (options._skipAuthInterceptor) {
    return mergedOptions;
  }

  // Never attach a bearer token to a cross-origin request — unlike the cookie
  // jar, a manual Authorization header has no same-origin protection and would
  // leak the access token to a foreign host.
  if (attachAuth) {
    // Token attached directly by a retry takes precedence over any stored token,
    // since SAVE_AUTH_TOKENS may be false (cookie-based auth) but the refresh
    // endpoint still returns a fresh access token we need to forward.
    const directToken = options._authToken;
    const token = directToken ?? (SAVE_AUTH_TOKENS ? await tokenStore.getAccessToken() : null);

    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }
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
    // Only the bearer/localStorage token store has anything to clear. In cookie
    // mode the store is inert (and on the server `react-secure-storage` doesn't
    // exist), so skip the no-op side effect. `onUnauthorized` stays
    // unconditional — it's the redirect, already a server-side no-op.
    if (SAVE_AUTH_TOKENS) await tokenStore.clear();
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
