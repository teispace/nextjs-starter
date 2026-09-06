# Security

The defaults here are the ones a review would ask for. This guide explains
what is on, what it costs, and the two decisions you have to make yourself.

## Response headers

Every response carries these, built in `src/lib/security/headers.ts` and
applied from `next.config.ts`:

| Header | Value | Why |
| :-- | :-- | :-- |
| `X-Content-Type-Options` | `nosniff` | Stops content-type guessing. |
| `X-Frame-Options` | `SAMEORIGIN` | Blocks framing by other sites. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Keeps paths and queries off other origins. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context. |
| `Permissions-Policy` | camera, geolocation, microphone, payment, USB and more denied | Nothing is available until you allow it. |
| `X-DNS-Prefetch-Control` | `on` | Latency, not security. |
| `Strict-Transport-Security` | two years, subdomains, preload | **Only when the public URL is https.** |

`X-XSS-Protection` is deliberately absent: modern browsers ignore it, and the
filter it enabled introduced vulnerabilities in the browsers that honoured it.
A content security policy replaces it.

HSTS and the policy's `upgrade-insecure-requests` are gated on the public app
URL being https. Sent over plain http, they make a browser upgrade every
asset request on a host that has no certificate, and the page never loads.
That is why a local production build works and why the end-to-end suite
asserts both headers stay off.

## Three CSP modes

`CSP_MODE` selects one:

| Mode | Policy | Cost |
| :-- | :-- | :-- |
| `static` (default) | No nonces. Scripts allow `'unsafe-inline'` because Next emits inline bootstrap scripts. | Every page still prerenders. |
| `nonce` | A fresh nonce per request with `'strict-dynamic'`, the strict policy from the framework docs. | A nonce is per request, so every page renders dynamically. The static shell is gone. |
| `off` | No policy from this application. | Only when something in front of the app sets its own. |

Be honest about `static`: it blocks foreign script origins, plugins, framing,
base-URI changes, and form hijacking, but it does not stop an injected inline
script. It is the right default for a template because it keeps prerendering,
and prerendering is most of the performance story. Turn on `nonce` when the
application handles data where cross-site scripting is the risk that
outranks time to first byte.

In nonce mode, an inline script you add needs the nonce:

```tsx
const nonce = await getNonce();
<script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />
```

`getNonce()` returns `undefined` outside nonce mode, so the same code works
in all three.

### Adding an origin

Anything the browser must reach that is not your own origin has to be in the
policy. The API origin and its websocket counterpart are added for you from
`NEXT_PUBLIC_API_URL`. For a third-party script or font host, extend
`buildCsp` in `src/lib/security/csp.ts` rather than widening a directive to
`*`. If you cannot name the origin, you cannot restrict it.

## Cookies and sessions

Sessions are HttpOnly cookies from your API, and this application never
composes an `Authorization` header, so there is no token to leak. The server
forwards only an allowlisted set of cookies upstream
(`FORWARD_COOKIE_ALLOWLIST`), which keeps an unrelated third-party cookie
from riding along to your API. See [auth](auth.md).

## Logs never carry secrets

The logger redacts by path: root keys, one level down, and header locations,
covering the usual names for tokens, cookies, and authorization headers.
Logging a whole request or response object is still a bad habit, since
redaction covers known paths rather than any depth. Log the fields you meant.

Redaction is tested against the real path list, so someone adding a sensitive
field to a log surface finds out from the suite.

## Request correlation

The proxy stamps `X-Request-Id` on every request, the server forwards it
upstream, and it appears in log lines and error reports. When your API logs
it too, one identifier follows a request through both systems.

## The two decisions that are yours

1. **Authorization.** This application checks that a session exists. It does
   not model roles or permissions, because those belong to the API that owns
   the data. Guards here decide which screen someone sees, not what they may
   read.
2. **Abuse protection.** There is no rate limiting on Route Handlers or
   Server Actions. Both are public endpoints. Put limits in front of the API,
   at the edge, or add them to the handlers before launch.

## Before launch

- `CSP_MODE` is a deliberate choice, with a note of why.
- The public URL is https, so HSTS is actually sent.
- Every third-party origin is named in the policy.
- Route Handlers and Server Actions validate input with zod, and every action
  that touches user data uses `authActionClient`.
- Rate limiting exists somewhere in the path.
- `pnpm audit` is clean, and `minimumReleaseAge` in the workspace file is
  still on: it refuses packages published in the last day, so a compromised
  release is usually yanked before it can reach an install.
