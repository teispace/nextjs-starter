import type { NextRequest } from 'next/server';

import { DEFAULT_TIMEOUT_MS } from '@/lib/config/constants';
import {
  getServerApiBaseUrl,
  readForwardableCookieHeader,
  readIncomingRequestId,
} from '@/lib/http/server';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/http/shared';
import { logger } from '@/lib/logger';

/**
 * Backend-for-frontend proxy: `/api/backend/<path>` forwards to the API's
 * `<path>` with the browser's session cookies, so the browser only ever
 * talks to this origin. The API can then live on a private network, cookies
 * stay first-party, and CORS never enters the picture.
 *
 * Forwarded from the request: method, path, query string, body (streamed),
 * `content-type`, `accept`, and sanitised cookies. Relayed from the API:
 * status, body (streamed), `content-type`, `content-disposition`, and every
 * `set-cookie`. Hop-by-hop headers and the API's cache headers are dropped;
 * responses are never cached here.
 */
const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language', 'if-none-match'];
const RELAY_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'content-language',
  'etag',
  'location',
];
const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const proxy = async (request: NextRequest, { params }: RouteContext<'/api/backend/[...path]'>) => {
  const { path } = await params;
  const target = `${getServerApiBaseUrl()}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const requestId = (await readIncomingRequestId()) ?? generateRequestId();

  const headers = new Headers({ [REQUEST_ID_HEADER]: requestId });
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const cookie = await readForwardableCookieHeader();
  if (cookie) headers.set('cookie', cookie);

  const hasBody = !BODYLESS_METHODS.has(request.method) && request.body !== null;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by fetch when streaming a request body.
      ...(hasBody ? { duplex: 'half' as const } : {}),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    logger.error(
      { err, requestId, path: `/${path.join('/')}` },
      'Backend proxy upstream call failed',
    );
    return Response.json(
      { status: 502, code: 'ERR_UPSTREAM', message: 'The API is unavailable.', requestId },
      { status: 502, headers: { [REQUEST_ID_HEADER]: requestId, 'cache-control': 'no-store' } },
    );
  }

  const responseHeaders = new Headers({
    [REQUEST_ID_HEADER]: requestId,
    'cache-control': 'no-store',
  });
  for (const name of RELAY_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const setCookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', setCookie);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
};

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
