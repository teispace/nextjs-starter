# HTTP Clients

**TL;DR** — Two interchangeable HTTP clients (`fetchClient`, `axiosClient`) preconfigured for typical JSON APIs. Cookie-mode auth by default. Two entry points so the same API works in client components AND Server Components without leaking `next/headers` into the client bundle. Errors come back as a typed `ApiException`, never thrown. Every request carries an `X-Request-Id` for end-to-end correlation. Pass typed query objects via `{ params }` — no `URLSearchParams` boilerplate.

```
src/lib/utils/http/
├─ shared/                  ← request-id, error parsing, params serialiser, runtime guards
├─ fetch-client/            ← Fetch adapter on the shared foundation
├─ axios-client/            ← Axios adapter on the shared foundation (same surface)
├─ __bundle-sentinel__/     ← Build-time regression gate (do not delete)
├─ client-utils.ts          ← TokenRefreshManager + helpers
├─ token-store.ts           ← secureStorageTokenStore (inert in cookie-mode)
├─ index.ts                 ← Universal entry: fetchClient, axiosClient, toSearchParams
└─ server.ts                ← Server-only entry: same shape + next/headers cookie forwarding
```

Feature code imports from `@/lib/utils/http` (universal) or `@/lib/utils/http/server` (Server Components only). The `shared/` layer is internal — its concerns leak through `fetchClient` / `axiosClient`, not separate imports.

---

## Table of Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Choosing a client](#choosing-a-client)
- [Making requests](#making-requests)
- [Typed queries and pagination](#typed-queries-and-pagination)
- [Error handling](#error-handling)
- [Cancellation and timeouts](#cancellation-and-timeouts)
- [Authentication](#authentication)
- [Server-side rendering](#server-side-rendering)
- [Request correlation (X-Request-Id)](#request-correlation-x-request-id)
- [Custom clients](#custom-clients)
- [API reference](#api-reference)
- [Best practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick start

```ts
import { fetchClient } from '@/lib/utils/http';

const result = await fetchClient.get<User>('/users/123');

if (result.isLeft()) {
  // result.value is an ApiException
  return showError(result.value);
}

const user = result.value; // typed as User
```

Same call in a Server Component — no extra wiring, cookies forward automatically:

```ts
// app/[locale]/profile/page.tsx
import { fetchClient } from '@/lib/utils/http';

export default async function ProfilePage() {
  const result = await fetchClient.get<User>('/auth/me');
  if (result.isLeft()) return <div>Not signed in</div>;
  return <Profile user={result.value} />;
}
```

---

## Configuration

### Environment

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

`NEXT_PUBLIC_API_URL` is the **bare origin** — no `/api/v{n}` suffix. The version prefix is treated as part of the contract, owned by the frontend, and appended internally via `getApiBaseUrl()`:

- Empty → relative/proxied requests under the same origin.
- Includes `/api/v1` by accident → stripped with a logger warning (no double-prefix).
- Bumping API version → one-line change in `src/lib/config/constants.ts`, no env churn across environments.

The full env schema lives in `src/lib/env/schema.ts`.

### Constants

| Constant | File | Default | Meaning |
|---|---|---|---|
| `API_PREFIX` | `src/lib/config/constants.ts` | `'/api/v1'` | URI version segment appended to `NEXT_PUBLIC_API_URL` |
| `SAVE_AUTH_TOKENS` | `src/lib/config/constants.ts` | `false` | Cookie-mode auth (default) vs bearer-mode |
| `API_RESPONSE_DATA_KEY` | `src/lib/config/constants.ts` | `'data'` | Key auto-unwrapped from the success envelope; override per-call via `dataKey` |

### Endpoint paths

`src/lib/config/app-apis.ts` is the single place to keep server-side endpoint paths. Paths are relative to the API base — they don't repeat `/api/v1`. The defaults below are illustrative; replace them with the routes your API exposes:

```ts
export const AppApis = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    capabilities: '/auth/login/capabilities',
  },
} as const;
```

---

## Choosing a client

| | `fetchClient` (recommended) | `axiosClient` |
|---|---|---|
| Runtime | Native Fetch | Axios |
| Bundle | 0 KB | ~30 KB |
| Works in | Browser, RSC, Server Actions, Route Handlers, `proxy.ts`, Edge | Same — except not Edge |
| When to reach for | Default for everything | Axios-specific features (cancellation tokens, advanced transforms) |

Both clients share **identical** contracts: same return type, same `_skipAuthInterceptor` escape hatch, same `params` option, same auth/cookie/request-id behaviour, same `ApiException` errors. **Don't mix them in the same feature** — pick one and stick to it.

```ts
import { fetchClient } from '@/lib/utils/http';
import { axiosClient } from '@/lib/utils/http'; // when you need it
```

---

## Making requests

### Verbs

```ts
fetchClient.get<T>(url, options?, dataKey?)
fetchClient.post<T>(url, data?, options?, dataKey?)
fetchClient.put<T>(url, data?, options?, dataKey?)
fetchClient.patch<T>(url, data?, options?, dataKey?)
fetchClient.delete<T>(url, options?, dataKey?)
```

Each returns `ResultAsync<T>` — alias for `Promise<Either<ApiException, T>>`. **Nothing ever throws.** Network failures, 5xx, validation errors, all 4xx — every failure mode lands in the left side of the result.

### Handling the result

Three patterns, all valid:

```ts
const result = await fetchClient.get<User>('/users/123');

// 1. Guard + value (most readable)
if (result.isLeft()) {
  return handleError(result.value);
}
const user = result.value;

// 2. fold — pattern match into a single value
const greeting = result.fold(
  (err) => `Error: ${err.message}`,
  (user) => `Hello, ${user.name}`,
);

// 3. isRight — when you only care about the success path
if (result.isRight()) {
  setUser(result.value);
}
```

See [Error handling](#error-handling) for what `ApiException` exposes (validation helpers, field errors, `requestId` for tracing).

### Response unwrapping

The clients assume the API wraps each success in `{ status, path, message, data, timestamp }`. By default, they return the inner `data` field — that's what `dataKey = 'data'` controls. If your API uses a different envelope key, set `API_RESPONSE_DATA_KEY` (or override per-call).

```ts
const result = await fetchClient.get<User>('/users/123');
// result.value === envelope.data — typed as User
```

To get the whole envelope, pass `null`:

```ts
const result = await fetchClient.get<ApiResponse<User>>('/users/123', undefined, null);
// result.value.timestamp, result.value.path, etc.
```

To unwrap a different key:

```ts
const result = await fetchClient.get<User[]>('/users', undefined, 'items');
```

---

## Typed queries and pagination

Both clients accept a `params` option that takes a **typed query object** and serialises it for you. No string concat, no inline `URLSearchParams` boilerplate.

The shared serialiser (`toSearchParams`) skips `undefined`/`null`/`''` so server-side defaults (`page=1`, `size=10`, etc.) stay implicit, and it repeats keys for arrays (`tag=a&tag=b`). **Both clients use the same serialiser** — axios's default is overridden so query strings are byte-identical regardless of which client made the call.

### Define a query type per endpoint

Extend `BaseQueryParams` for offset pagination or `BaseCursorQueryParams` for cursor pagination, then add endpoint-specific filters:

```ts
// src/features/users/types/users-query.types.ts
import type { BaseQueryParams } from '@/types';

export interface UsersQuery extends BaseQueryParams {
  status?: 'active' | 'invited' | 'disabled';
  roleId?: string;
}
```

`BaseQueryParams` covers the common offset-pagination fields (`page`, `size`, `search`, `sort`, `order`) — keep your endpoint-specific queries consistent with these names and the API's defaults will line up cleanly.

### Call the endpoint with a single typed argument

```ts
import { fetchClient } from '@/lib/utils/http';
import type { PaginatedApiResponse } from '@/types';

export async function fetchUsers(query: UsersQuery) {
  return fetchClient.get<PaginatedApiResponse<User>>('/users', { params: query });
}

// Call site — structured object, not positional args:
await fetchUsers({ page: 2, size: 20, status: 'active' });
```

Mix `params` with other transport options freely:

```ts
await fetchClient.get<PaginatedApiResponse<User>>('/users', {
  params: { page: 1 },
  signal: AbortSignal.timeout(5000),
  cache: 'no-store',
});
```

### `satisfies` for inline queries

When you don't want to declare a `const query: UsersQuery = ...` separately, use TypeScript's `satisfies` operator to check the literal against the query interface without widening its type:

```ts
const result = await fetchClient.get<PaginatedApiResponse<User>>('/users', {
  params: { page: 1, size: 20, status: 'active' } satisfies UsersQuery,
});
```

This catches typos in field names at compile time without forcing you to invent a variable just to type-check it.

### Offset pagination

```ts
const result = await fetchClient.get<PaginatedApiResponse<User>>('/users', {
  params: { page: 1, size: 20 } satisfies UsersQuery,
});

if (result.isRight()) {
  const { items, meta } = result.value;
  // meta: { totalItems, totalPages, currentPage, pageSize, sortBy, order }
}
```

### Cursor pagination

```ts
import type { BaseCursorQueryParams, CursorPaginatedApiResponse } from '@/types';

interface FeedQuery extends BaseCursorQueryParams {
  authorId?: string;
}

const result = await fetchClient.get<CursorPaginatedApiResponse<Post>>('/feed', {
  params: { cursor, size: 20 } satisfies FeedQuery,
});

if (result.isRight()) {
  const { items, meta } = result.value;
  // meta: { nextCursor, prevCursor, hasMore, pageSize, sortBy, order }
}
```

### React infinite-scroll example

```tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchClient } from '@/lib/utils/http';
import type { CursorPaginatedApiResponse } from '@/types';

export function PostFeed() {
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    const result = await fetchClient.get<CursorPaginatedApiResponse<Post>>('/feed', {
      params: { cursor: cursor ?? undefined, size: 20 } satisfies FeedQuery,
    });
    if (result.isLeft()) return;
    setItems((prev) => [...prev, ...result.value.items]);
    setCursor(result.value.meta.nextCursor);
    setHasMore(result.value.meta.hasMore);
  }

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <>
      {items.map((p) => <Post key={p.id} {...p} />)}
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </>
  );
}
```

### Raw `toSearchParams`

Exported for cases where you need a query string **without** making a request — building an `href`, redirect target, cache key:

```ts
import { toSearchParams } from '@/lib/utils/http';

const href = `/users?${toSearchParams<UsersQuery>({ status: 'active' })}`;
```

For actual requests, prefer `{ params }` — it's terser and the client handles the edge cases (`?` vs `&`, empty serialisation) for you.

---

## Error handling

All errors are `ApiException` instances on the left side of the result. `parseApiError` lifts every field from the API's error envelope into typed properties.

### Field-level validation errors

When the API returns a structured `errors` array, `ApiException` exposes helpers to read it:

```ts
const result = await fetchClient.post('/users', invalidPayload);

if (result.isLeft()) {
  const err = result.value;

  err.containsKey('email');              // boolean
  err.getErrorMessage('email');          // 'Invalid format' | undefined
  err.getErrorMessageIfExists('email');  // 'Invalid format' | err.message
  err.getFieldErrors();                  // { email: 'Invalid format', ... }
}
```

For forms, `getFieldErrors()` is the one-call setter you want:

```ts
const result = await fetchClient.post('/users', data);
if (result.isLeft()) {
  setFieldErrors(result.value.getFieldErrors());
}
```

See the [`ApiException` reference](#apiexception) for the full surface.

---

## Cancellation and timeouts

Both clients fail fast and **distinguish three response-less failures** so the UI can react correctly — a request the user cancelled shouldn't render the same as a server that went dark.

| Failure | `status` | `code` | Predicate |
|---|---|---|---|
| Caller aborted via `AbortSignal` | `0` | `ERR_CANCELLED` | `err.isCancelled()` |
| Exceeded the timeout budget | `0` | `ERR_TIMEOUT` | `err.isTimeout()` |
| Transport error (DNS, refused, offline) | `0` | `ERR_NETWORK` | `err.isNetworkError()` |

`err.isClientFailure()` is `true` for all three (anything with `status === 0`).

### Default timeout

Every request has a default timeout of `DEFAULT_TIMEOUT_MS` (10s) — the fetch client and the axios client behave identically. Override per request, or pass `0` to disable it for a long-poll / SSE / large upload:

```ts
await fetchClient.get('/report', { timeout: 30_000 }); // 30s for this call
await fetchClient.get('/events', { timeout: 0 });       // no timeout (streaming)
```

Set a client-wide default when creating a custom client: `createFetchClient({ ..., timeout: 30_000 })`.

### Caller cancellation

Pass your own `AbortSignal`; it's composed with the timeout via `AbortSignal.any`, so whichever fires first wins. Aborting yourself surfaces as `isCancelled()`; the timeout surfaces as `isTimeout()`.

```ts
const controller = new AbortController();
const promise = fetchClient.get<User[]>('/users', { signal: controller.signal });

controller.abort(); // e.g. component unmounted, user navigated away

const result = await promise;
if (result.isLeft() && result.value.isCancelled()) {
  return; // expected — don't surface an error toast
}
```

Typical React pattern — cancel the in-flight request on unmount:

```tsx
useEffect(() => {
  const ac = new AbortController();
  fetchClient.get<User>('/auth/me', { signal: ac.signal }).then((result) => {
    if (result.isLeft()) {
      if (result.value.isCancelled()) return; // unmounted — ignore
      return showError(result.value);
    }
    setUser(result.value);
  });
  return () => ac.abort();
}, []);
```

The signal and timeout both survive a 401 → refresh → retry: the retry gets a fresh timeout budget, and an already-aborted caller signal short-circuits it immediately.

---

## Authentication

### Cookie-mode (default)

`SAVE_AUTH_TOKENS = false`. Assumes the server sets HttpOnly `access` and `refresh` cookies on login and accepts them on subsequent requests. The frontend:

- Sends every request with `credentials: 'include'` (browser cookie jar) or an injected `Cookie` header (server).
- Never reads tokens from the response body or stores them client-side.
- Token refresh hits `POST /auth/refresh` with `credentials: 'include'` — the `refresh` cookie carries the token; no `Authorization` header.

Safer default: tokens never touch JavaScript-accessible storage, so XSS can't exfiltrate them.

### Bearer-mode

Flip `SAVE_AUTH_TOKENS = true`. The clients then:

- Persist `accessToken` / `refreshToken` to `react-secure-storage` (wrapped by `src/services/storage/secure-storage.service.ts`).
- Attach `Authorization: Bearer <accessToken>` to every request.
- Send the stored refresh token as Bearer when calling `/auth/refresh`.

Both modes hit the **same** server endpoint; only the carrier differs.

### Automatic refresh on 401

Both clients debounce a single refresh per token-expiry window and replay the failed request once the new token is in hand. Failure (or hitting `MAX_ATTEMPTS = 3` within `COOLDOWN_MS = 1000`) clears local state and triggers `onUnauthorized` — defaulted to redirect to `/auth/login?redirectTo=<current>` (`AppPaths.auth.login`). A placeholder page ships at that route; replace its body with your sign-in flow.

**Refresh is browser-only.** On the server (Server Components, Server Actions, Route Handlers, `proxy.ts`) a 401 is returned as a `Left` immediately, with no refresh attempt and no retry. Two reasons: a render cannot write a rotated cookie back to the browser, and the refresh singleflight is process-wide, so a server-side refresh would be shared across every concurrent user's request. Handle the 401 as a value — render the signed-out state or redirect — and let the client re-authenticate.

### Skip auth on a single call

```ts
await fetchClient.get('/public/data', { _skipAuthInterceptor: true });
await axiosClient.get('/public/data', { _skipAuthInterceptor: true });
```

---

## Server-side rendering

`credentials: 'include'` (fetch) and `withCredentials: true` (axios) are **browser-only**. Node has no cookie jar, so without explicit forwarding HttpOnly cookies never reach the upstream API from a Server Component, Server Action, or Route Handler.

The HTTP layer ships **two entry points** to handle this without forcing every consumer to think about runtimes:

```ts
// Universal (any runtime, no SSR cookie forwarding)
import { fetchClient } from '@/lib/utils/http';

// Server-only (Server Components, Server Actions, Route Handlers)
import { fetchClient } from '@/lib/utils/http/server';
```

| Entry point | Where to use | Cookies |
|---|---|---|
| `@/lib/utils/http` | Anywhere (`'use client'` files, Server Components, Edge, isomorphic utils) | Browser jar attaches automatically on client; no forwarding server-side |
| `@/lib/utils/http/server` | Server Components, Server Actions, Route Handlers | Reads `next/headers` and forwards the incoming request's cookies on every call |

### Why two entry points?

Next.js refuses to compile a `'use client'` file whose import graph touches `next/headers`. Earlier designs that tried to hide the server-only code behind a runtime check (`if (isBrowser()) skip`) still failed because the bundler statically resolves the import graph — `'server-only'` correctly trips at build time. The split barrel encodes the boundary as part of the public API, which is the only design Next.js's module-resolution rules actually allow.

Importing `@/lib/utils/http/server` from a `'use client'` file fails the build with a clear error from the `server-only` package. That's the design — it forces the call site to be explicit.

### Practical patterns

**Client components — use the universal entry:**

```tsx
'use client';

import { fetchClient } from '@/lib/utils/http';

export function Profile() {
  // Browser cookie jar carries the session cookie automatically.
  const result = await fetchClient.get<User>('/auth/me');
  /* ... */
}
```

**Server Components needing the user's cookies — use the server entry:**

```tsx
// app/[locale]/profile/page.tsx — no 'use client'
import { fetchClient } from '@/lib/utils/http/server';

export default async function ProfilePage() {
  // next/headers reads the request cookies and forwards them.
  const result = await fetchClient.get<User>('/auth/me');
  if (result.isLeft()) return <SignedOut />;
  return <Profile user={result.value} />;
}
```

**Public endpoints from Server Components — use the universal entry:**

```tsx
// app/page.tsx — no auth required
import { fetchClient } from '@/lib/utils/http';

export default async function LandingPage() {
  // Public endpoint — no cookies needed; universal entry avoids unnecessary work.
  const stats = await fetchClient.get<Stats>('/public/stats');
  /* ... */
}
```

### Build-time regression gate

`src/lib/utils/http/__bundle-sentinel__/` contains a `'use client'` file that imports every public symbol from `@/lib/utils/http`. It's referenced from `app/[locale]/layout.tsx`, so `yarn build` and CI fail loudly if anything that touches `next/headers` ever leaks into the universal entry's import graph. Don't delete it — it's the only thing standing between us and a silent re-occurrence of the original bug.

---

## Request correlation (X-Request-Id)

Every outgoing request is stamped with a fresh UUID matching `REQUEST_ID_PATTERN` (`^[A-Za-z0-9_-]{1,128}$`). A typical well-behaved server-side correlation layer will:

- Accept client-supplied IDs that match the pattern → echo the same ID on the response.
- Reject malformed input → generate its own and echo that.
- Always set `X-Request-Id` on the response (success header **and** error envelope `requestId` field).
- Expose the header via CORS so cross-origin browser fetches can read it.

The clients read the response header (or `body.requestId` on errors), stash it on `ApiException.requestId`, and make it available to your error handlers / Sentry / logger:

```ts
const result = await fetchClient.get('/users/123');
if (result.isLeft()) {
  logger.error({ requestId: result.value.requestId }, 'lookup failed');
  // Now grep both browser AND server-side logs for the same requestId.
}
```

### Override per call

If you already have an upstream trace ID (e.g. SSR passing a Vercel request ID through), pass it explicitly:

```ts
await fetchClient.get('/users', {
  headers: { 'X-Request-Id': vercelRequestId },
});
```

The interceptor only generates a fresh ID when none was provided or the provided value doesn't match the pattern.

---

## Custom clients

Use `createFetchClient` / `createAxiosClient` to point at a different upstream (a second service, a third-party API) while keeping all the shared behaviour:

```ts
import { createFetchClient, secureStorageTokenStore } from '@/lib/utils/http';

const upstream = createFetchClient({
  baseURL: 'https://other-service.internal',
  tokenStore: secureStorageTokenStore,
  cache: 'force-cache',
  defaultOptions: { headers: { 'X-Service': 'upstream' } },
  onUnauthorized: () => { window.location.href = '/auth/login'; },
});
```

The `createAxiosClient` shape is the same; pass `defaultHeaders` instead of `defaultOptions.headers`.

For a custom token store, implement the `TokenStore` interface (5 methods: `getAccessToken`, `saveAccessToken`, `getRefreshToken`, `saveRefreshToken`, `clear`) and pass it in. See `src/lib/utils/http/token-store.ts` for the default `react-secure-storage` implementation as a reference.

---

## API reference

### Client methods

| Method | Signature |
|---|---|
| `get<T>` | `(url, options?, dataKey?) => ResultAsync<T>` |
| `post<T>` | `(url, data?, options?, dataKey?) => ResultAsync<T>` |
| `put<T>` | `(url, data?, options?, dataKey?) => ResultAsync<T>` |
| `patch<T>` | `(url, data?, options?, dataKey?) => ResultAsync<T>` |
| `delete<T>` | `(url, options?, dataKey?) => ResultAsync<T>` |

- `options` is `ExtendedRequestInit` for fetch and `AxiosRequestConfig` for axios. Both accept `params?: Record<string, unknown>` and `_skipAuthInterceptor?: boolean` on top of the standard fields.
- `dataKey` defaults to `'data'`. Pass `null` to skip unwrapping (returns the whole envelope). Pass a string to unwrap a different key.

### `Either<L, R>` methods

| Method | Returns |
|---|---|
| `isLeft()` | `true` when the result is an error |
| `isRight()` | `true` when the result is a success |
| `value` | The error (left) or the data (right) |
| `fold(onLeft, onRight)` | Pattern-match into a single value |

### `ApiException`

| Field / method | Type | Notes |
|---|---|---|
| `status` | `number` | HTTP status. `0` for response-less failures (cancel / timeout / network). |
| `message` | `string` | Human-readable summary from the API. |
| `code` | `string \| undefined` | Machine-readable code (e.g. `USER_NOT_FOUND`, or `ERR_CANCELLED` / `ERR_TIMEOUT` / `ERR_NETWORK`). |
| `errors` | `Array<Record<string, string>>` | Field-level validation errors. |
| `data` | `Record<string, unknown>` | Arbitrary extra context. |
| `path` | `string \| undefined` | Request path the API logged. |
| `requestId` | `string \| undefined` | Correlation ID for log grepping. |
| `containsKey(key)` | `boolean` | Whether a field error exists for `key`. |
| `getErrorMessage(key)` | `string \| undefined` | Field error message. |
| `getErrorMessageIfExists(key)` | `string` | Field error or the general message. |
| `getFieldErrors()` | `Record<string, string>` | All field errors flattened. |
| `isCancelled()` | `boolean` | Request was aborted via an `AbortSignal`. |
| `isTimeout()` | `boolean` | Request exceeded its timeout budget. |
| `isNetworkError()` | `boolean` | Transport failed with no HTTP response. |
| `isClientFailure()` | `boolean` | Any `status === 0` failure (cancel / timeout / network). |
| `ApiException.fromResponse(body, fallbackStatus?)` | `ApiException` | Build from an API error envelope. |
| `ApiException.cancelled(message?, stack?)` | `ApiException` | A cancelled-request exception. |
| `ApiException.timeout(message?, stack?)` | `ApiException` | A timed-out-request exception. |
| `ApiException.network(message?, stack?)` | `ApiException` | A network-failure exception. |
| `ApiException.convertAny(error)` | `ApiException` | Defensive fallback for unknown error values. |

### Shared utilities

```ts
import { toSearchParams } from '@/lib/utils/http';
```

`toSearchParams(query)` — typed object → `URLSearchParams`. Skips `undefined`/`null`/`''`. Repeats array values.

### Types

All exported from `@/types`. See `src/types/common/` for the source of truth — these definitions are the contract.

- **Response envelopes:** `ApiResponse<T>`, `ApiErrorResponse`
- **Pagination:** `ApiPaginationMeta`, `PaginatedApiResponse<T>`, `ApiCursorMeta`, `CursorPaginatedApiResponse<T>`
- **Query inputs:** `BaseQueryParams`, `BaseCursorQueryParams` — extend these for endpoint-specific queries.
- **Auth payloads:** `AuthUser`, `AuthTokens`, `AuthResponse`, `RefreshTokensResponse` — adjust fields to match your API.
- **Transport:** `TokenStore`, `QueryParams`, `FetchClientOptions`, `AxiosClientOptions`, `ExtendedRequestInit`.

---

## Best practices

Ranked by impact — the first three matter the most.

### Do

1. **Always type the response.** `fetchClient.get<User>(...)`, never `<any>`. The compiler can't help you without it.
2. **Always handle both result branches.** `if (result.isLeft())` or `result.fold(...)` — never reach `.value` blindly.
3. **Type the query.** Define `interface FooQuery extends BaseQueryParams { ... }` per endpoint; pass it via `{ params: query }`.
4. **Log the request ID on failures.** `logger.error({ requestId: err.requestId }, ...)` — instant cross-stack tracing.
5. **Centralise endpoints.** Keep route strings in `AppApis` rather than scattering literals across feature code.
6. **One client per feature.** Don't mix `fetchClient` and `axiosClient` in the same module.

### Don't

- ❌ Read tokens from `process.env`, `localStorage`, or anywhere outside `secureStorageTokenStore`.
- ❌ Set `credentials: 'include'` manually — it's already the default.
- ❌ Build `URLSearchParams` inline or accept positional `(page, size)` args — pass a typed query object via `{ params }`.
- ❌ Bake `/api/v1` into `NEXT_PUBLIC_API_URL`.
- ❌ Import `next/headers` from feature code — the clients already handle SSR cookie forwarding.
- ❌ Use `<any>` as a response type. If the API shape is genuinely unknown, model it as `unknown` and narrow.

---

## Troubleshooting

### "Max refresh attempts reached"

Backoff tripped (3 attempts within `COOLDOWN_MS = 1000`). Check that `POST /auth/refresh` actually rotates the refresh cookie / returns the new tokens. Common culprit: the server-side session was revoked while the frontend kept retrying.

### Always redirected to `/auth/login` in dev

Cookie-mode requires the server to set `access` / `refresh` cookies on a domain the frontend can read. In local dev this means same-host (e.g. both on `localhost`) or a matching cookie domain. Check whatever `COOKIE_DOMAIN` / `COOKIE_SAMESITE` settings your API uses.

### CORS errors with cookies

The server must allow the frontend's origin **and** `credentials: true`. Add your frontend origin to whatever CORS allow-list your API exposes.

### Types don't match the response

Most often: the API wraps the payload in `{ data: ... }`, and the client already unwraps `data` by default. If you see `result.value.data.foo`, you've double-unwrapped — drop the `.data` or pass `null` as `dataKey` if you really want the envelope.

### `X-Request-Id` missing on response

Two causes:
1. CORS — the server is only exposing `X-Request-Id` to allow-listed origins.
2. The server rejected your supplied ID (didn't match `REQUEST_ID_PATTERN`) and the response carried a different one. The error body's `requestId` is the authoritative value; the clients fall back to it automatically.
