/**
 * `X-Request-Id` propagation.
 *
 * A well-behaved server-side request-correlation layer accepts client-supplied
 * IDs only when they match `REQUEST_ID_PATTERN` (alphanumeric/dash/underscore,
 * ≤128 chars); otherwise it generates a fresh ID. We send a compliant UUID per
 * call by default so browser logs, client-side pino logs, and server-side logs
 * all share the same trace ID without extra correlation work.
 */

export const REQUEST_ID_HEADER = 'X-Request-Id';

export const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidRequestId(value: string): boolean {
  return REQUEST_ID_PATTERN.test(value);
}

/**
 * Web Crypto `randomUUID()` is available in modern browsers, Node 19+,
 * and the Edge runtime. UUIDs match `REQUEST_ID_PATTERN` so any server
 * enforcing the same pattern will accept them verbatim.
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
