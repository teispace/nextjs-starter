# Features

Code is grouped by feature, not by technical type. Everything the `account` feature needs lives in `src/features/account/` and ships together. Copy its layout for new features.

```
src/features/<name>/
├── api/
│   ├── schema.ts       zod contracts; types are inferred from them
│   ├── keys.ts         TanStack Query keys (feature-owned)
│   ├── server.ts       DAL: Server Component reads ('server-only', `use cache` for public data)
│   ├── actions.ts      Server Actions ('use server', built with authActionClient)
│   └── queries.ts      queryOptions + hooks for client reads
├── components/         server and client components (+ *.test.tsx)
├── hooks/              feature hooks (optional)
├── store/              Redux slice, selectors, persistence entry (optional)
├── types/              types that are not inferred from a schema (optional)
├── index.ts            client-safe public API
└── server.ts           server-only public API ('server-only')
```

Skip folders that have no files.

## The two barrels

- `index.ts` exports what a `'use client'` module may import: components, hooks, queries, keys, schema types, and Server Action references. It must not re-export anything that imports `server-only`.
- `server.ts` exports the DAL and server components. Server Components import from here.

Importing `@/features/<name>/api/server` directly from a client file fails the build; that is the guard working.

## Adding a feature

1. Create `src/features/<name>/api/schema.ts` with the zod contracts.
2. Add `api/server.ts` for the reads Server Components need. Public data gets `'use cache'`, `cacheTag`, and `cacheLife`; user data uses `serverHttp` and stays uncached.
3. Add `api/actions.ts` for mutations. Use `authActionClient` for anything that touches user data.
4. If the client must refetch or mutate locally, add `api/keys.ts` and `api/queries.ts`.
5. Build components. Prefer Server Components; mark leaves `'use client'`.
6. If the feature owns client-only state, add `store/<name>.slice.ts`, register it in `src/store/rootReducer.ts`, and (if it must survive reloads) a `store/persist.ts` entry listed in `src/store/index.ts`.
7. Export from `index.ts` and `server.ts`.
8. Tests: DAL and actions in `api/*.test.ts` (node project), components in `components/*.test.tsx` (jsdom project), and an end-to-end case in `e2e/` when the feature owns a route.

See [docs/data-layer.md](../../docs/data-layer.md) for how the pieces interact.

## Rules

- **Encapsulation**: features import each other only through barrels. Shared code moves to `src/components`, `src/lib`, or `src/types`.
- **Thin app layer**: `src/app` composes features and handles routing concerns (metadata, Suspense boundaries, session gating). Business logic lives in features.
- **Types live with code**: infer from schemas where possible; put cross-cutting types in `src/types`.
- **No comments explaining what**: the code should read itself. Comments are for non-obvious why.
