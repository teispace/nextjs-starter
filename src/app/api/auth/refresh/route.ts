import { AppApis } from '@/lib/config/app-apis';
import { getServerApiBaseUrl, readForwardableCookieHeader } from '@/lib/http/server';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/http/shared';
import { logger } from '@/lib/logger';
import { callerKey, rateLimit, tooManyRequests } from '@/lib/security/rate-limit';

/**
 * Session refresh, browser-facing.
 *
 * The browser cannot call the API's refresh endpoint itself in a way that
 * lets the app control cookies, so this same-origin handler forwards the
 * incoming cookies to `POST /auth/refresh` and relays every `Set-Cookie` the
 * API answers with. The universal HTTP client calls it once on a 401 and
 * replays the original request when it succeeds.
 */
/**
 * A refresh costs an upstream request, and a stolen or expired cookie will
 * retry forever without a limit. Ten per minute per address is far above
 * what the browser client does on its own (it refreshes once per 401) and
 * far below what a loop achieves.
 */
const REFRESH_LIMIT = 10;
const REFRESH_WINDOW_MS = 60_000;

export async function POST(): Promise<Response> {
  const limit = await rateLimit({
    key: await callerKey('auth-refresh'),
    limit: REFRESH_LIMIT,
    windowMs: REFRESH_WINDOW_MS,
  });
  if (!limit.ok) {
    logger.warn({ retryAfter: limit.retryAfter }, 'Session refresh rate limited');
    return tooManyRequests(limit);
  }

  const cookie = await readForwardableCookieHeader();
  if (!cookie) return new Response(null, { status: 401 });

  const requestId = generateRequestId();
  let upstream: Response;
  try {
    upstream = await fetch(`${getServerApiBaseUrl()}${AppApis.auth.refresh}`, {
      method: 'POST',
      headers: { cookie, [REQUEST_ID_HEADER]: requestId, accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (err) {
    logger.error({ err, requestId }, 'Session refresh upstream call failed');
    return new Response(null, { status: 502 });
  }

  const status = upstream.ok ? 204 : upstream.status === 401 || upstream.status === 403 ? 401 : 502;
  const response = new Response(null, { status });
  for (const setCookie of upstream.headers.getSetCookie()) {
    response.headers.append('set-cookie', setCookie);
  }
  response.headers.set('cache-control', 'no-store');
  return response;
}
