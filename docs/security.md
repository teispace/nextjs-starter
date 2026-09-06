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

## Authorization

`AuthUser` carries optional `roles` and `permissions`, and `@/lib/auth`
turns them into checks:

```ts
import { hasPermission, requirePermission, requireRole } from '@/lib/auth';

// In a page, under Suspense. Signed out redirects to sign in; signed in
// without the claim renders forbidden.tsx with a 403.
const user = await requireRole(['admin'], AppPaths.dashboard);
const user = await requirePermission(['invoice.write']);

// In a component, to hide a control the user cannot use.
{hasPermission(user, 'invoice.delete') ? <DeleteButton /> : null}
```

An action declares what it needs next to its name, and the client refuses
the call before the body runs:

```ts
export const deleteInvoice = authActionClient
  .metadata({ name: 'invoice.delete', permissions: ['invoice.delete'] })
```

Three properties matter:

- **It fails closed.** An API that sends neither claim grants nothing, and a
  signed-out visitor fails every check.
- **`forbidden()` and `unauthorized()`** render their own pages instead of a
  redirect that loses what the visitor wanted. They need
  `experimental.authInterrupts`, which `next.config.ts` enables. The page
  carries `noindex`, but read the note below about its status code.
- **It is not the enforcement point.** The API owns authorization and must
  reject anything it should not serve. These checks decide which screen
  someone sees, which is why they can safely live on this side.

### The status code of a refused page

A guard sits under `<Suspense>`, because reading the session is request data
and Cache Components refuses to prerender a route that reads it in the
shell. By the time the guard runs, the response has started streaming and
its status is already 200, so the visitor sees the 403 page while the
transport says 200. That is a property of streaming, not of these helpers.

It does not matter for a person, who reads the page. It matters for machine
clients and crawlers. When a real status is required, enforce it where the
response has not started: a Route Handler, or the proxy in front. Moving the
guard into the page body to get the status is not an option here; it fails
the build, which is the framework telling you the route can no longer be
prerendered.

## Rate limiting

Route Handlers are public endpoints, and each one here costs an upstream
request, so both ship with a fixed-window limit:

| Endpoint | Limit | Why |
| :-- | :-- | :-- |
| `POST /api/auth/refresh` | 10 per minute per address | The browser refreshes once per 401; a stolen cookie retries forever. |
| `/api/backend/*` (BFF) | 120 per minute per address | One browser request becomes one API request. |

A refused caller gets a 429 with `Retry-After` and the `RateLimit-*`
headers, so a well-behaved client backs off instead of guessing.

```ts
const limit = await rateLimit({ key: await callerKey('report-export'), limit: 5, windowMs: 60_000 });
if (!limit.ok) return tooManyRequests(limit);
```

Two limits of the default, stated plainly:

- **The store is a map in one process.** Across several instances each keeps
  its own count, so the effective limit multiplies by the instance count.
  `RateLimitStore` is two methods; implement it against Redis or your edge
  provider and pass it in, or put the limit in front of the application.
- **The caller's address comes from proxy headers.** A client can send
  `x-forwarded-for` itself, so this is only meaningful when a proxy you
  control overwrites it. Behind nothing, anyone can pick their own bucket.

## The decision that is still yours

Authorization here shapes the UI; the API must enforce it. If your API does
not check permissions on every endpoint it serves, adding roles to this
application changes nothing about who can read what.

## Before launch

- `CSP_MODE` is a deliberate choice, with a note of why.
- The public URL is https, so HSTS is actually sent.
- Every third-party origin is named in the policy.
- Route Handlers and Server Actions validate input with zod, and every action
  that touches user data uses `authActionClient`, with the claims it needs
  in its metadata.
- The rate limiter uses a shared store, or a limit sits in front of the app,
  and the proxy in front overwrites `x-forwarded-for`.
- `pnpm audit` is clean, and `minimumReleaseAge` in the workspace file is
  still on: it refuses packages published in the last day, so a compromised
  release is usually yanked before it can reach an install.
