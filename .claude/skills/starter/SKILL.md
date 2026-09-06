---
name: starter
description: Conventions and workflows for this server-first Next.js codebase. Use when adding a feature, page, Server Action, query, slice, or locale; when choosing where data should be read or written; when a build fails on Cache Components, caching, or an unstable value; or before finishing a change that must pass the repo's gates.
---

# Working in this codebase

A server-first App Router application. Read `AGENTS.md` for the rules and
`docs/README.md` for the guides. This skill is the short path: which layer a
piece of code belongs to, what to write there, and what to run before you
stop.

## Pick the layer before writing code

| The data is… | Put it in | Import from |
| :-- | :-- | :-- |
| Public, same for every visitor | `features/<f>/api/server.ts` with `'use cache'` | `@/lib/http/server` → `publicServerHttp` |
| Specific to the signed-in user | `features/<f>/api/server.ts`, no cache, under `<Suspense>` | `@/lib/http/server` → `serverHttp` |
| Refetched, paginated, or optimistic on the client | `features/<f>/api/queries.ts` | `@/lib/query`, `@/lib/http` → `http` |
| A write of any kind | `features/<f>/api/actions.ts` | `@/lib/actions` |
| Not server data (UI, drafts, preferences) | `features/<f>/store/` | `@/store/hooks` |

Server data never goes in the client store. A write is always a Server
Action, never a `fetch` from a component.

## Rules that cause build failures when broken

- **Request APIs are dynamic.** `cookies()`, `headers()`, `searchParams`,
  `connection()`, and `params` of a dynamic route must sit under
  `<Suspense>`, or the route stops prerendering and the build fails.
- **Never `'use cache'` a function that reads cookies.** Public reads use
  `publicServerHttp`, which forwards none.
- **No unstable values in the static shell.** `Date.now()`, `Math.random()`,
  and `crypto.randomUUID()` belong inside a cache scope or a Suspense
  boundary.
- **Check the session in the page, not the layout.** Layouts do not re-run
  on client navigation.
- **`console.*` is banned.** Use `logger` from `@/lib/logger`, or
  `getRequestLogger()` when the log should carry the request id.
- **Server variables are unreadable from `'use client'` modules** by design.

## Nothing throws at the transport

Every HTTP call resolves to `Result<T, HttpError>`:

```ts
const result = await serverHttp.get<Invoice>(AppApis.invoice.byId(id), { schema });
if (!result.ok) {
  if (result.error.isNotFound()) notFound();
  throw result.error; // let the segment's error.tsx handle it
}
return result.data;
```

Decide at the call site: fall back, `notFound()`, `redirect()`, or throw.
Helpers live in `@/types` (`unwrapOr`, `match`, `mapOk`). In a `queryFn`,
end with `.then(unwrapForQuery)` so TanStack Query sees a rejection.

## Adding a feature

1. `pnpm exec next-maker feature <name> --api --store --persist` scaffolds
   the layers, registers the endpoints, the slice, and the translations.
2. Write the zod contracts in `api/schema.ts` first; every type is inferred
   from them.
3. The DAL reads; actions write and `revalidateTag` what they changed.
4. Export through the two barrels: `index.ts` is client-safe, `server.ts`
   is server-only.
5. Co-locate tests. `*.test.ts` runs in node, `*.test.tsx` in jsdom.

`src/features/account` implements every pattern and is the reference.

## Composition anchors (starter repository only)

Shared files carry `// @next-maker:<id>` comments so an optional feature can
be removed from a generated project. If you touch a line inside an anchor,
keep the anchor. If you add a file that belongs to an optional feature,
update `next-maker.json` in the same change;
`test/next-maker-manifest.test.ts` enforces it.

## Before you finish

```bash
pnpm ci:check          # Biome lint, format, import order
pnpm type-check        # next typegen, then tsc
pnpm check:deprecated  # fails on any deprecated API
pnpm test              # Vitest, node + jsdom projects
pnpm build             # production build; needs NEXT_PUBLIC_APP_URL
```

`pnpm validate` runs all five. A production build served over plain http
must not send HSTS, and a page that reads request data must still
prerender: both are covered by the e2e smoke suite.
