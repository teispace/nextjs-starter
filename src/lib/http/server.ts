import 'server-only';

import { cookies, headers } from 'next/headers';

import { API_PREFIX } from '@/lib/config/constants';
import { env } from '@/lib/env';

import { createHttpClient, type HttpClient } from './core/client';
import { isValidRequestId, REQUEST_ID_HEADER } from './shared';
import type { HttpClientOptions } from './types';

/**
 * **Server-only HTTP client.** Use it from Server Components, Server
 * Actions, and Route Handlers that must call the API as the signed-in user:
 * the incoming request's cookies are forwarded and its request id is
 * propagated so backend logs correlate with this render.
 *
 * It never refreshes a session. A render cannot write a rotated cookie back
 * to the browser, and refresh state shared across requests would leak one
 * user's session into another's. A 401 comes back as a value; render the
 * signed-out state or redirect, and let the client refresh.
 *
 * Importing this module from a `'use client'` file fails the build (`server-only`).
 */

// RFC 6265 cookie-name token chars; anything else cannot legally be a name.
const COOKIE_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
// Separators and quote chars that could splice extra cookies into the
// forwarded header. Control chars are checked by code point.
const COOKIE_VALUE_SEPARATOR_RE = /[";,\s]/;

const hasIllegalCookieValueChar = (value: string): boolean => {
  if (COOKIE_VALUE_SEPARATOR_RE.test(value)) return true;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

/**
 * Cookie names forwarded to the API. Empty forwards every well-formed
 * cookie; populate it with the API's session cookie names to keep analytics
 * and third-party cookies from crossing origins.
 */
export const FORWARD_COOKIE_ALLOWLIST: readonly string[] = [];

/** The current request's cookies as a sanitised `Cookie` header value. */
export const readForwardableCookieHeader = async (
  allowlist: readonly string[] = FORWARD_COOKIE_ALLOWLIST,
): Promise<string | undefined> => {
  const all = (await cookies()).getAll();
  const allow = new Set(allowlist);
  const pairs = all.filter((c) => {
    if (allow.size > 0 && !allow.has(c.name)) return false;
    return COOKIE_NAME_RE.test(c.name) && !hasIllegalCookieValueChar(c.value);
  });
  if (pairs.length === 0) return undefined;
  return pairs.map((c) => `${c.name}=${c.value}`).join('; ');
};

/** The incoming `X-Request-Id`, when the edge or proxy stamped one. */
export const readIncomingRequestId = async (): Promise<string | undefined> => {
  const value = (await headers()).get(REQUEST_ID_HEADER);
  return value && isValidRequestId(value) ? value : undefined;
};

/**
 * Where server-side calls go. `API_INTERNAL_URL` lets containers reach the
 * API over a private network name while browsers keep using the public
 * origin; it falls back to the public URL, then to same-origin.
 */
export const getServerApiBaseUrl = (): string => {
  const raw = (env.API_INTERNAL_URL ?? env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
  if (!raw) return API_PREFIX;
  return `${raw.replace(/\/api\/v\d+$/, '')}${API_PREFIX}`;
};

export const createServerHttpClient = (options: HttpClientOptions = {}): HttpClient =>
  createHttpClient({
    baseURL: getServerApiBaseUrl(),
    cache: 'no-store',
    cookieResolver: readForwardableCookieHeader,
    requestIdResolver: readIncomingRequestId,
    ...options,
  });

export const serverHttp = createServerHttpClient();
