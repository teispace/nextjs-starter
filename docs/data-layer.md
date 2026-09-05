# Data layer

How data moves through this application: where reads happen, where writes happen, what is cached, and how the session is checked. The `account` feature (`src/features/account`) implements every pattern below and is the reference to copy.

## The four surfaces

| Surface        | Module                          | Runs on         | Use it for                                                                 |
| :------------- | :------------------------------ | :-------------- | :------------------------------------------------------------------------- |
| DAL            | `features/<f>/api/server.ts`    | Server only     | Every read a Server Component makes. Public data is `use cache`d.          |
| Server Actions | `features/<f>/api/actions.ts`   | Server only     | Every mutation. Validated input, known caller, plain error shape.          |
| Queries        | `features/<f>/api/queries.ts`   | Server + client | Reads the client must refetch, poll, paginate, or update optimistically.   |
| Redux          | `features/<f>/store/`           | Client          | State that is not server data: UI, preferences, drafts, wizard progress.   |

Contracts live in `features/<f>/api/schema.ts` as zod schemas; the TypeScript types are inferred from them, so a response that drifts from the schema fails validation at the transport instead of surfacing as `undefined` deep in a component.

## Reads

### Server Components read through the DAL

```ts
// features/account/api/server.ts
import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { publicServerHttp } from '@/lib/http/server';

export async function getSignInCapabilities() {
  'use cache';
  cacheTag('account:sign-in-capabilities');
  const result = await publicServerHttp.get(AppApis.auth.capabilities, { schema, skipAuth: true });
  if (result.ok) {
    cacheLife('hours');
    return result.data;
  }
  cacheLife('seconds');
  return DEFAULTS;
}
```

Rules that keep this correct under Cache Components:

- **Public, user-independent data** is a `use cache` function with a `cacheTag` and a `cacheLife`. It runs once per profile, not per visitor, and becomes part of the static shell. Use `publicServerHttp`: it forwards no cookies and reads no request headers, so it is legal inside the cache scope and during a static prerender.
- **User data** goes through `serverHttp`, which forwards the sanitised session cookie and the request id. It must not be `use cache`d, and the component that calls it must sit under `<Suspense>` because reading cookies makes that subtree dynamic. Wrap it in React `cache()` when several components on one page need the same value (see `getCurrentUser`).
- **The server never refreshes a session.** A 401 comes back as a value; render the signed-out state or redirect. The browser refreshes on its next request.
- **Return values, not exceptions.** Every transport call resolves to `Result<T, HttpError>`. Decide at the call site whether a failure is a fallback, a `notFound()`, a `redirect()`, or a thrown error for the boundary.

### Client Components read through queries

```ts
// features/account/api/queries.ts
export const signInCapabilitiesQuery = () =>
  queryOptions({
    queryKey: accountKeys.signInCapabilities(),
    queryFn: ({ signal }) =>
      http.get(AppApis.auth.capabilities, { schema, skipAuth: true, signal }).then(unwrapForQuery),
    staleTime: 5 * 60 * 1000,
  });

export const useSignInCapabilities = () => useSuspenseQuery(signInCapabilitiesQuery());
```

And the page hands the data over:

```tsx
async function Section() {
  await prefetchQuery({ queryKey: accountKeys.signInCapabilities(), queryFn: getSignInCapabilities });
  return (
    <HydrateQueries>
      <SignInOptions />
    </HydrateQueries>
  );
}
```

- `prefetchQuery` fills the request-scoped `QueryClient`; `HydrateQueries` dehydrates it into the HTML; `useSuspenseQuery` on the client starts with the data and no refetch. Skip the `await` to stream the result instead.
- On the server, prefetch through the DAL (as above) so the static shell includes the data. The client `queryFn` only runs for later refetches.
- A failed prefetch is not dehydrated. The client fetches again and owns the error state, so the page never crashes because of a background prefetch.
- `unwrapForQuery` turns the transport `Result` into the throw that TanStack Query expects, so `error`, `retry`, and error boundaries behave normally. The query client only retries network failures once; the transport already retried transient statuses.
- Keys are owned by the feature (`api/keys.ts`) and structured so `invalidateQueries({ queryKey: accountKeys.all })` clears the whole feature.

## Writes

```ts
// features/account/api/actions.ts
'use server';

export const signOut = authActionClient
  .metadata({ name: 'account.signOut' })
  .action(async () => {
    const result = await serverHttp.post<void>(AppApis.auth.logout, undefined, {
      onResponse: (response) => void relaySetCookies(response),
    });
    if (!result.ok && !result.error.isUnauthorized()) throw result.error;
    revalidateTag(SIGN_IN_CAPABILITIES_TAG, 'max');
    return { signedOut: true };
  });
```

- `actionClient` validates `.inputSchema()` input, adds a request id to `ctx`, logs the call with its duration, and converts anything thrown into `result.serverError`, a plain `ActionError` (`HttpError.toPlain()` shape). Unknown errors are replaced by a generic message; their text can carry internals.
- `authActionClient` loads the session first and returns a 401 `ActionError` for anonymous callers. An action is a public endpoint: the check belongs inside it, not in a layout.
- The API's `Set-Cookie` headers never reach the browser on a server-to-server call. `relaySetCookies` replays them through Next's cookie store, which is writable only in actions and Route Handlers.
- After a mutation, `revalidateTag` (or `revalidatePath`) invalidates the server cache, and the client calls `queryClient.invalidateQueries` for the affected keys. `useAction` from `next-safe-action/hooks` exposes `execute`, `isPending`, and `result`.
- Use `returnServerError(actionError(...))` for expected failures with a typed code, and `returnValidationErrors` for server-side field errors.

## Session

| Helper                       | Where                            | Behaviour                                                                                          |
| :--------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------- |
| `getCurrentUser()`           | Server Components, actions       | One upstream call per request (React `cache`). `null` when signed out or when the API is down.     |
| `requireUser(returnTo?)`     | Server Components under Suspense | Redirects to `/auth/login?redirectTo=...` when signed out.                                         |
| `authActionClient`           | Actions                          | Injects `ctx.user`; refuses anonymous callers.                                                     |
| `http` (browser)             | Client Components                | Refreshes once on 401 via `POST /api/auth/refresh`, replays, then redirects to sign-in if it fails. With the `bff` option it calls `/api/backend/...` on this origin, which forwards to the API with the session cookies. |

Check the session in the **page** (or the component that renders user data), not in a layout: layouts do not re-run on client navigation. The `/dashboard` page shows the pattern.

## Failure boundaries

`error.tsx` catches a whole route segment. For a section that should fail on its own (a widget backed by one query, a session lookup), wrap it in `SectionErrorBoundary` from `@/components`: it is built on `catchError` from `next/error`, so `retry()` re-renders only that subtree, `redirect()` and `notFound()` pass through, and the raw error message is never shown. The home page wraps its sign-in options and session status this way.

## Caching summary

| Data                          | Mechanism                                     | Invalidation                                    |
| :---------------------------- | :-------------------------------------------- | :---------------------------------------------- |
| Public server reads           | `use cache` + `cacheTag` + `cacheLife`         | `revalidateTag` from an action or Route Handler |
| Per-request server dedupe     | React `cache()`                               | Ends with the request                           |
| Client reads                  | TanStack Query (`staleTime`, `gcTime`)         | `invalidateQueries`, refetch, hydration         |
| Client-only state             | Redux + `definePersistence`                   | Versioned envelopes with migrations             |

## Choosing between them

- The data is rendered once and rarely changes on the client: DAL only, no query.
- The client needs live updates, pagination, or optimistic UI: DAL prefetch + query hydration.
- The data is user-specific and only shown once: `serverHttp` in a Suspense boundary; no cache.
- The value is not server data at all: Redux (persisted if it must survive reloads).
- Something changes on the server: a Server Action, always.

## Feature file layout

```
features/<name>/
  api/
    schema.ts     zod contracts and inferred types
    keys.ts       query keys
    server.ts     DAL ('server-only')
    actions.ts    Server Actions ('use server')
    queries.ts    queryOptions + hooks
  components/     server and client components
  store/          Redux slice + persistence (optional)
  index.ts        client-safe barrel: components, queries, schema types, actions
  server.ts       server-only barrel: DAL and server components
```

Two barrels matter: a `'use client'` module can import `@/features/<name>` without pulling `server-only` into the bundle, and a Server Component imports `@/features/<name>/server` for the DAL.
