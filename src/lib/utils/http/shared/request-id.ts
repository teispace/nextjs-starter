/**
 * Request-ID propagation, mirroring the NestJS starter's
 * `X-Request-Id` middleware.
 *
 * The backend accepts client-supplied IDs only when they match
 * `REQUEST_ID_PATTERN` (alphanumeric/dash/underscore, ≤128 chars) — anything
 * else is rejected and a fresh UUID is generated server-side. We send a
 * compliant UUID per call by default so browser logs, frontend pino logs,
 * and backend pino logs all share the same trace ID without server-side
 * correlation work.
 */

export const REQUEST_ID_HEADER = 'X-Request-Id';

export const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidRequestId(value: string): boolean {
  return REQUEST_ID_PATTERN.test(value);
}

/**
 * Web Crypto `randomUUID()` is available in modern browsers, Node 19+,
 * and the Edge runtime. UUIDs match `REQUEST_ID_PATTERN` so the backend
 * will accept them verbatim.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/** Read `X-Request-Id` from a `Headers` instance, case-insensitively. */
export function extractRequestIdFromHeaders(headers: Headers | undefined): string | undefined {
  if (!headers) return undefined;
  const value = headers.get(REQUEST_ID_HEADER);
  return value && isValidRequestId(value) ? value : undefined;
}

/**
 * Read `X-Request-Id` from a plain object (axios `error.response.headers`,
 * which can be `Record<string, string | string[] | undefined>`).
 */
export function extractRequestIdFromHeaderRecord(
  headers: Record<string, unknown> | undefined,
): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === REQUEST_ID_HEADER.toLowerCase());
  if (!key) return undefined;
  const raw = headers[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && isValidRequestId(value) ? value : undefined;
}
