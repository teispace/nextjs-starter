import { SAVE_AUTH_TOKENS } from '@/lib/config';
import type { ExtendedRequestInit, InterceptorResult, TokenStore } from '@/types';

import { generateRequestId, isValidRequestId, REQUEST_ID_HEADER } from '../shared';

function hasHeader(headers: HeadersInit | undefined, name: string): boolean {
  if (!headers) return false;
  const lower = name.toLowerCase();
  if (headers instanceof Headers) return headers.has(name);
  if (Array.isArray(headers)) return headers.some(([k]) => k.toLowerCase() === lower);
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

/**
 * Optional async callback that returns a `Cookie` header value to inject
 * into the outgoing request. Returns `undefined` to skip injection.
 *
 * The universal `fetchClient` never passes one of these — cookies flow
 * via the browser jar with `credentials: 'include'`. The server-only
 * client (`@/lib/utils/http/server`) passes a callback that reads
 * `next/headers`, which is how SSR requests carry the user's cookies to
 * the backend.
 */
export type CookieResolver = () => Promise<string | undefined>;

export async function applyRequestInterceptors(
  options: ExtendedRequestInit,
  tokenStore: TokenStore,
  defaultOptions: RequestInit,
  resolveCookie?: CookieResolver,
): Promise<RequestInit> {
  const mergedHeaders: Record<string, string> = {
    ...(defaultOptions.headers as Record<string, string> | undefined),
    ...(options.headers as Record<string, string> | undefined),
  };

  // Request-ID: send a fresh ID per call unless the caller supplied a valid one.
  // Backend echoes whatever we send back to us when it matches its pattern.
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

  // Token attached directly by a retry takes precedence over any stored token,
  // since SAVE_AUTH_TOKENS may be false (cookie-based auth) but the refresh
  // endpoint still returns a fresh access token we need to forward.
  const directToken = options._authToken;
  const token = directToken ?? (SAVE_AUTH_TOKENS ? await tokenStore.getAccessToken() : null);

  if (token) {
    mergedHeaders.Authorization = `Bearer ${token}`;
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
