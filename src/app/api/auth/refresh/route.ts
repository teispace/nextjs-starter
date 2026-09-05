import { AppApis } from '@/lib/config/app-apis';
import { getServerApiBaseUrl, readForwardableCookieHeader } from '@/lib/http/server';
import { generateRequestId, REQUEST_ID_HEADER } from '@/lib/http/shared';
import { logger } from '@/lib/logger';

/**
 * Session refresh, browser-facing.
 *
 * The browser cannot call the API's refresh endpoint itself in a way that
 * lets the app control cookies, so this same-origin handler forwards the
 * incoming cookies to `POST /auth/refresh` and relays every `Set-Cookie` the
 * API answers with. The universal HTTP client calls it once on a 401 and
 * replays the original request when it succeeds.
 */
export async function POST(): Promise<Response> {
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
