# HTTP client

One transport-agnostic `HttpClient` with pluggable adapters. Every call resolves to a `Result`: nothing throws, every failure is an `HttpError` with a status and a code.

```
src/lib/http/
├─ core/client.ts          HttpClient, createHttpClient, extractDataByKey
├─ adapters/fetch.ts       default adapter
├─ adapters/axios.ts       optional adapter (bundled only when imported)
├─ auth/browser-refresh.ts singleflight refresh through /api/auth/refresh
├─ auth/redirect.ts        redirectToLogin
├─ shared/                 request ids, abort, search params, headers, body, retry, error mapping
├─ client.ts               `http`: the universal instance
├─ server.ts               `serverHttp`, `publicServerHttp`, cookie and request-id resolvers
├─ index.ts                public barrel
└─ __bundle-sentinel__/    build-time guard against server code leaking into the client bundle
```

## Entry points

| Import                                   | Where                                           | Cookies                        | Refresh on 401                 |
| :--------------------------------------- | :---------------------------------------------- | :----------------------------- | :----------------------------- |
| `http` from `@/lib/http`                 | anywhere                                        | browser jar only               | browser only, once, then replay |
| `serverHttp` from `@/lib/http/server`    | Server Components, actions, Route Handlers      | forwards the incoming cookies  | never                          |
| `publicServerHttp` from `@/lib/http/server` | `use cache` functions, static prerenders     | none                           | never                          |

`@/lib/http/server` imports `server-only`; importing it from a `'use client'` module fails the build.

## Quick start

```ts
import { http } from '@/lib/http';
import { AppApis } from '@/lib/config';

const result = await http.get<User[]>(AppApis.users.list, { params: { page: 2, tag: ['a', 'b'] } });
if (!result.ok) {
  // result.error is an HttpError
  return <ErrorState message={result.error.message} />;
}
result.data; // User[]
```

Paths are relative to the API base (`NEXT_PUBLIC_API_URL` + `/api/v1`); absolute URLs pass through. Endpoint paths live in `src/lib/config/app-apis.ts`.

## Requests

```ts
http.get<T>(url, options)
http.head<T>(url, options)
http.post<T>(url, body, options)
http.put<T>(url, body, options)
http.patch<T>(url, body, options)
http.delete<T>(url, options)
http.request<T>(url, { method, body, ...options })
```

`RequestOptions`:

| Option        | Type                                   | Notes                                                                                                    |
| :------------ | :------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `params`      | `QueryParams`                          | Typed query object. Arrays repeat the key, `null`/`undefined` are dropped, empty strings are kept.        |
| `headers`     | `HeadersInit`                          | Merged over the client defaults.                                                                         |
| `body`        | `unknown`                              | Plain objects are JSON (falsy values included). `FormData`, `Blob`, `ArrayBuffer`, typed arrays, `URLSearchParams`, and streams pass through. Strings are `text/plain`. |
| `signal`      | `AbortSignal`                          | Composed with the timeout; whichever fires first wins.                                                   |
| `timeout`     | `number`                               | Total budget in ms including retries and the refresh replay. `0` disables. Default 10 000.               |
| `retry`       | `Partial<RetryPolicy> \| false`        | Override or disable the policy for this call.                                                            |
| `schema`      | `{ safeParse }`                        | Any zod-compatible schema. A mismatch is a failed request (`ERR_RESPONSE_INVALID`).                       |
| `dataKey`     | `string \| null`                       | Envelope key to unwrap (default `data`); `null` returns the body untouched.                              |
| `skipAuth`    | `boolean`                              | Do not refresh on 401 (sign-in, refresh, public endpoints).                                              |
| `onResponse`  | `(response: Response) => void`         | Observe the final response after retries and refresh; the body is consumed. For headers, e.g. `Set-Cookie`. |
| `cache`, `next`, `credentials` | fetch options         | Passed to the adapter.                                                                                   |

## Results and errors

```ts
import { isOk, match, unwrapOr } from '@/types';

const users = unwrapOr(await http.get<User[]>('/users'), []);

match(await http.post<User>('/users', input), {
  ok: (user) => toast(`Created ${user.name}`),
  fail: (error) => form.setErrors(error.fieldErrors()),
});
```

`HttpError` (`@/lib/errors`):

| Member                                                | Meaning                                                              |
| :---------------------------------------------------- | :------------------------------------------------------------------- |
| `status`                                              | HTTP status, or `0` for failures without a response                  |
| `code`                                                | Server code, or one of `ERR_CANCELLED`, `ERR_TIMEOUT`, `ERR_NETWORK`, `ERR_RESPONSE_INVALID`, `ERR_HTTP` |
| `errors`, `data`, `path`, `requestId`                 | From the API error envelope                                          |
| `isCancelled()`, `isTimeout()`, `isNetworkError()`    | Client-side failures                                                 |
| `isUnauthorized()`, `isForbidden()`, `isNotFound()`, `isServerError()` | Status predicates                                   |
| `hasFieldError(name)`, `fieldError(name)`, `fieldErrorOrMessage(name)`, `fieldErrors()` | Validation helpers            |
| `toPlain()` / `HttpError.fromPlain()`                 | Cross the RSC and Server Action boundary                             |

`ResponseValidationError` extends `HttpError` with `issues` when a `schema` rejects the body.

## Retries, timeouts, cancellation

The default policy retries `GET`, `HEAD`, and `OPTIONS` twice on 408, 425, 429, 500, 502, 503, 504 and on network errors, with full-jitter exponential backoff (200 ms base, 2 s cap) and `Retry-After` when the server sends it. Mutations are never retried by default: a `POST` that timed out may have succeeded.

```ts
http.get('/report', { timeout: 60_000, retry: { retries: 4 } });
http.post('/orders', order, { retry: false });

const controller = new AbortController();
http.get('/search', { params: { q }, signal: controller.signal });
controller.abort(); // result.error.isCancelled()
```

## Authentication

Sessions are HttpOnly cookies. In the browser a 401 triggers one `POST /api/auth/refresh` (same-origin Route Handler, forwards cookies to the API, relays `Set-Cookie`), then one replay. Concurrent 401s share the refresh; a server that keeps rejecting trips a cooldown. If the refresh fails, `onUnauthorized` runs (`redirectToLogin` by default) and the 401 is returned.

On the server no client ever refreshes. `serverHttp` forwards the incoming cookies (sanitised, optionally allow-listed with `FORWARD_COOKIE_ALLOWLIST`) and a 401 comes back as a value.

Server Actions that change the session (sign in, sign out) call the API with `serverHttp` and replay its cookies:

```ts
await serverHttp.post(AppApis.auth.logout, undefined, {
  onResponse: (response) => void relaySetCookies(response),
});
```

## Same-origin proxy (BFF)

With the `bff` option on, `src/app/api/backend/[...path]/route.ts` forwards every browser call to the API: `/api/backend/orders/42?expand=items` becomes `GET <API_INTERNAL_URL>/api/v1/orders/42?expand=items` with the sanitised session cookies and the request id. Status, body (streamed), `content-type`, `etag`, `location`, and every `set-cookie` are relayed; hop-by-hop and cache headers are not, and nothing is cached. The universal client's base URL becomes `/api/backend` in the browser, so the API origin never reaches the client bundle, cookies stay first-party, and CORS is unnecessary. Server clients still reach the API directly.

## Request correlation

Every request carries `X-Request-Id`. The proxy stamps one on every incoming request (keeping a well-formed one from an upstream gateway) and echoes it on the response; `serverHttp` forwards it; the browser client mints one per call. `HttpError.requestId` holds the value the API echoed.

## Custom clients

```ts
import { axiosAdapter } from '@/lib/http/adapters/axios';
import { createHttpClient } from '@/lib/http';

export const paymentsHttp = createHttpClient({
  baseURL: env.NEXT_PUBLIC_PAYMENTS_URL,
  adapter: axiosAdapter(axios.create({ maxRedirects: 0 })),
  headers: { 'X-Client': 'web' },
  retry: { retries: 1 },
  dataKey: null,
});
```

`HttpClientOptions`: `baseURL`, `adapter`, `timeout`, `headers`, `credentials`, `cache`, `retry`, `dataKey`, `cookieResolver`, `requestIdResolver`, `auth: { refresh?, onUnauthorized? }`.

An adapter must resolve with a standard `Response` for any HTTP status and throw only for transport failures, aborts, and timeouts. Both built-in adapters follow that contract and share one test suite (`core/client.test.ts`).

## Server base URL

`getServerApiBaseUrl()` prefers `API_INTERNAL_URL`, then `NEXT_PUBLIC_API_URL`, then `NEXT_PUBLIC_APP_URL` (a relative `/api` cannot be fetched from the server). The `/api/v1` prefix is appended once.

## Troubleshooting

- **"Max session refresh attempts reached"**: the API rejects the refresh. Check that the API's cookies reach `/api/auth/refresh` (same registrable domain, `SameSite` settings) and that the refresh path in `AppApis.auth.refresh` is right.
- **Always redirected to sign-in in development**: the API is on another origin and its cookies are not sent. Run it behind the same host or set the backend `COOKIE_DOMAIN`.
- **`ERR_RESPONSE_INVALID`**: the schema and the API disagree. `error.issues` lists the paths.
- **Types do not match the response**: check `dataKey`; the API's envelope key may differ from `data`.
- **Prerender fails with an unstable value**: a call in the static shell minted a request id. Move the read into a `use cache` function (use `publicServerHttp`) or under `<Suspense>`.
