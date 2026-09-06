# Getting started

## Run it

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The example environment file already contains working local values, so the
app boots without editing anything. Point `NEXT_PUBLIC_API_URL` at your API
when you have one; with it empty, requests go to the same origin and the demo
pages render their signed-out state.

Node 24 or newer and pnpm 11 or newer are required, and `engines` enforces
it. Corepack picks the pinned pnpm version from `packageManager`.

## The five minutes that matter

Open these five files in order. Together they are the whole architecture, and
everything else in the repository is a variation on them.

| File | What to notice |
| :-- | :-- |
| `src/features/account/api/schema.ts` | Contracts are zod schemas. Every type is inferred from them, so a response that drifts fails at the transport rather than deep in a component. |
| `src/features/account/api/server.ts` | The data access layer. `import 'server-only'` at the top, `'use cache'` with a tag and a lifetime for public data. |
| `src/features/account/api/actions.ts` | Writes. Validated input, a named action, errors returned rather than thrown at the client. |
| `src/features/account/api/queries.ts` | Client reads. `queryOptions` plus a hook, sharing the keys in `api/keys.ts`. |
| `src/app/[locale]/(marketing)/page.tsx` | How a page composes them: cached data in the shell, request data under `<Suspense>`, sections that fail independently. |

## Your first change

Add a feature that reads a list from your API and shows it.

```bash
pnpm exec next-maker feature invoice --api --store --persist
```

That writes `src/features/invoice/` with the five API files, a component, a
store slice, tests, and both barrels; registers the endpoints in
`src/lib/config/app-apis.ts`; adds the slice to the root reducer and its
persistence entry; and adds a translation namespace. Then:

1. **Describe the response** in `api/schema.ts`. Start strict; loosen only
   where the API really is loose.
2. **Point the endpoint** at the real path in `src/lib/config/app-apis.ts`.
3. **Decide the read surface.** A list every visitor sees is a `'use cache'`
   function in `api/server.ts`. A list only the signed-in user sees drops the
   cache and moves under `<Suspense>`. A list the client paginates gets a
   query in `api/queries.ts` as well.
4. **Render it** from a page under `src/app/[locale]/(app)/`.
5. **Run the gates**: `pnpm validate`.

[Recipes](recipes.md) walks through the full version of this, including the
mutation and the cache invalidation.

## Where things live

```
src/
  app/          routes only; pages compose features and own their metadata
  features/     the domain: api/, components/, store/, two barrels
  components/   shared components that no single feature owns
  lib/          the platform: http, auth, actions, query, logger, security, seo, env
  store/        the client-only store, its persistence, and typed hooks
  i18n/         routing, request config, formats, translations
```

The rule of thumb: if two features need it, it goes in `src/components` or
`src/lib`. If one feature needs it, it stays inside that feature. `src/app`
holds routes and composition, not logic.

## The commands you will actually use

| Command | Purpose |
| :-- | :-- |
| `pnpm dev` | Development server. |
| `pnpm validate` | Everything CI runs, in order: lint, types, deprecations, tests, build. |
| `pnpm test:watch` | Vitest in watch mode while you work. |
| `pnpm test:e2e` | Playwright against a real production build. |
| `pnpm lint:fix` | Biome, including import sorting. |
| `pnpm env:sync` | Regenerate `.env.example` from your `.env`, keeping values only where a line is marked public. |
| `pnpm check:deprecated` | Fails on any deprecated API, resolving overloads and following aliases. |

## What to read next

[Data layer](data-layer.md) is the one guide worth reading end to end before
you write much code. [Results and errors](results-and-errors.md) explains the
one convention that will feel unusual for the first hour and obvious
afterwards.
