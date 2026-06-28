/**
 * Whether a request URL resolves to the configured upstream origin, and is
 * therefore safe to attach credentials (bearer token) to.
 *
 * The browser cookie jar already refuses to send cookies cross-site, but a
 * manually-attached `Authorization` header has no such protection — so an
 * absolute URL pointing at a foreign origin would otherwise leak the access
 * token. This is the same-origin gate for that header.
 *
 * - A relative request path always resolves against `baseURL` → trusted.
 * - An absolute request URL with a relative `baseURL` (no API origin
 *   configured) is, by definition, a foreign origin → untrusted.
 * - Otherwise compare origins; anything unparseable is treated as untrusted.
 */
export function resolvesToUpstream(requestURL: string, baseURL: string): boolean {
  const isAbsolute = /^https?:\/\//i.test(requestURL);
  if (!isAbsolute) return true;

  const baseIsAbsolute = /^https?:\/\//i.test(baseURL);
  if (!baseIsAbsolute) return false;

  try {
    return new URL(requestURL).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}
