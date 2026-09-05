import 'server-only';

import { cookies } from 'next/headers';

type SameSite = 'strict' | 'lax' | 'none';

export interface ParsedSetCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: SameSite;
}

const SAME_SITE_VALUES = new Set<SameSite>(['strict', 'lax', 'none']);

/** Parse one `Set-Cookie` header value. Malformed input yields `null`. */
export const parseSetCookie = (header: string): ParsedSetCookie | null => {
  const [pair, ...attributes] = header.split(';');
  const eq = pair?.indexOf('=') ?? -1;
  if (!pair || eq <= 0) return null;
  const parsed: ParsedSetCookie = {
    name: pair.slice(0, eq).trim(),
    value: pair.slice(eq + 1).trim(),
    httpOnly: false,
    secure: false,
  };
  if (!parsed.name) return null;

  for (const attribute of attributes) {
    const idx = attribute.indexOf('=');
    const key = (idx === -1 ? attribute : attribute.slice(0, idx)).trim().toLowerCase();
    const raw = idx === -1 ? '' : attribute.slice(idx + 1).trim();
    switch (key) {
      case 'path':
        parsed.path = raw;
        break;
      case 'domain':
        parsed.domain = raw;
        break;
      case 'max-age': {
        const n = Number(raw);
        if (Number.isFinite(n)) parsed.maxAge = n;
        break;
      }
      case 'expires': {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) parsed.expires = d;
        break;
      }
      case 'httponly':
        parsed.httpOnly = true;
        break;
      case 'secure':
        parsed.secure = true;
        break;
      case 'samesite': {
        const v = raw.toLowerCase() as SameSite;
        if (SAME_SITE_VALUES.has(v)) parsed.sameSite = v;
        break;
      }
      default:
        break;
    }
  }
  return parsed;
};

/**
 * Copy the API's `Set-Cookie` headers onto the outgoing response.
 *
 * A Server Action or Route Handler that signs a user in or out talks to the
 * API server-to-server, so the browser never sees the API's cookie headers.
 * This replays them through Next's cookie store, which is the only place a
 * render or action may write cookies. Only call it from those contexts:
 * writing cookies during a Server Component render throws.
 */
export const relaySetCookies = async (response: Response): Promise<number> => {
  const values = response.headers.getSetCookie();
  if (values.length === 0) return 0;
  const store = await cookies();
  let applied = 0;
  for (const value of values) {
    const cookie = parseSetCookie(value);
    if (!cookie) continue;
    store.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
    applied++;
  }
  return applied;
};
