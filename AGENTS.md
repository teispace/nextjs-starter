<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Teispace Next.js Starter

Server-first App Router template. Next 16.3 (Cache Components), React 19, TypeScript 7, Tailwind v4, pnpm 11, Biome, TanStack Query, next-safe-action, Redux Toolkit, next-intl.

## Stack decisions (don't fight these)

- **Package manager**: pnpm only. `pnpm-workspace.yaml` sets `minimumReleaseAge` and `allowBuilds`; do not add `ignoredBuiltDependencies` or `.npmrc` overrides. Scripts run with `pnpm <script>`.
- **Linter/formatter**: Biome only (`biome.json`). `pnpm lint` / `pnpm lint:fix` / `pnpm format`; CI runs `pnpm ci:check` (`biome ci`). No ESLint, no Prettier.
- **Rendering**: `cacheComponents` is on. Request APIs (`cookies()`, `headers()`, `searchParams`, `connection()`) must sit under `<Suspense>`; public reads use `'use cache'` with `cacheTag` and `cacheLife`. Unstable values (`Date.now()`, `crypto.randomUUID()`) in the static shell fail the build; move them into a cache scope or a Suspense boundary.
- **Data access**: Server Components read through the feature DAL (`features/<f>/api/server.ts`, `import 'server-only'`). User data uses `serverHttp`; public cached data uses `publicServerHttp`. Never `use cache` a function that reads cookies. See `docs/data-layer.md`.
- **Mutations**: Server Actions in `features/<f>/api/actions.ts` built with `actionClient` / `authActionClient` from `@/lib/actions` (zod `.inputSchema()`, `.metadata({ name })`). Errors return as `result.serverError` (`ActionError`); do not throw raw errors to the client. Cookie changes from the API are relayed with `relaySetCookies`.
- **Client reads**: TanStack Query. `queryOptions` in `features/<f>/api/queries.ts`, keys in `api/keys.ts`, server prefetch with `prefetchQuery` + `HydrateQueries` from `@/lib/query`. `queryFn` uses `http` and `unwrapForQuery`.
- **HTTP**: one `HttpClient` (`@/lib/http`) with adapters; `fetch` is default, `axiosAdapter` is opt-in. Universal `http`; server entries in `@/lib/http/server` (`serverHttp`, `publicServerHttp`). Calls return `Result<T, HttpError>`; nothing throws. Endpoint paths in `src/lib/config/app-apis.ts`. See `src/lib/http/README.md`.
- **Auth**: HttpOnly cookies only. `getCurrentUser` / `requireUser` from `@/lib/auth` on the server; the browser client refreshes once via `POST /api/auth/refresh`; the server never refreshes. No bearer tokens, no web storage tokens. Check sessions in pages and actions, never only in layouts.
- **Env vars**: import `env` from `@/lib/env` (`@teispace/env`, server / client / shared groups). Add new vars in `src/lib/env/index.ts` (client vars must be `NEXT_PUBLIC_` and listed in `runtimeEnv`) and in `.env.example`. Reading a server var from a `'use client'` module throws by design.
- **Logging**: `logger` from `@/lib/logger` (pino), `getRequestLogger()` from `@/lib/logger/request` when a request id should be attached (server, dynamic). Never `console.*`. Keep log surfaces shallow; redaction covers root keys, one level, and header locations.
- **Routing interception**: `src/proxy.ts` (stamps `X-Request-Id`, next-intl routing, optional nonce CSP). Do NOT create `middleware.ts`.
- **i18n**: next-intl 4. Routes under `src/app/[locale]/` with `(marketing)` and `(app)` route groups. Locale from `next/root-params` in `src/i18n/request.ts`; never call `setRequestLocale`. Navigation from `@/i18n/navigation`. Formats in `src/i18n/formats.ts`.
- **State**: Redux Toolkit for client-only state. `combineSlices` in `src/store/rootReducer.ts`; persistence via `definePersistence` entries registered in `src/store/index.ts`; typed hooks from `src/store/hooks.ts`; `useAppHydrated()` before rendering persisted values that differ from the SSR default. Server data does not go in Redux.
- **WebSocket**: `@/lib/ws` only (`shared/` and the lifecycle emitter are private). Browser-only; cookie sessions by default, `auth` provider for token handshakes. See `src/lib/ws/README.md`.
- **Theme**: `@teispace/next-themes` rendered from `src/app/[locale]/layout.tsx` with `getThemeScript` in `<head>`; config in `src/lib/theme/config.ts`. Read theme state through CSS (`dark:`), not React.
- **Security**: headers and CSP from `src/lib/security`; `CSP_MODE` selects `static` (default) / `nonce` / `off`. Inline scripts need `nonce={await getNonce()}`.
- **SEO**: `generateSEOMetadata` from `@/lib/config/seo` in every page's `generateMetadata`; JSON-LD via `@/lib/seo`. Default Open Graph card at `src/app/[locale]/opengraph-image.tsx`, referenced as `/opengraph-image`.
- **Tests**: Vitest 5 with `node` (`*.test.ts`) and `jsdom` (`*.test.tsx`, or `// @vitest-environment jsdom`) projects, MSW for HTTP, `renderWithProviders` from `test/test-utils.tsx`. Playwright in `e2e/` runs against a production build. Co-locate unit tests next to the source.
- **Import alias**: `@/*` → `src/*`.

## Directory layout

```
src/
  app/                    App Router. [locale]/(marketing), [locale]/(app)/dashboard, [locale]/auth/login,
                          api/auth/refresh, manifest.ts, sitemap.ts, robots.ts, icons, global-error.tsx
  features/<name>/        api/{schema,keys,server,actions,queries}.ts, components/, store/, index.ts, server.ts
  components/             Shared, cross-feature components
  i18n/                   routing, request, formats, navigation, translations/
  lib/
    actions/              next-safe-action clients and ActionError
    auth/                 getCurrentUser, requireUser, relaySetCookies
    config/               API base, app paths, endpoint paths, locales, constants, SEO
    env/                  @teispace/env schema
    errors/               AppError, HttpError, ResponseValidationError
    http/                 HttpClient core, adapters, browser refresh, server entry
    logger/               pino, request logger, request-error reporter
    query/                QueryClient factory, prefetch, hydration
    security/             CSP, headers, nonce
    seo/                  JSON-LD
    theme/                next-themes config
    ws/                   Socket.IO client, hooks, Redux bridge
  providers/              RootProvider (Query + Store + Intl), StoreProvider
  store/                  store, persistence, hooks, rootReducer, slices/
  instrumentation.ts      onRequestError reporting
  proxy.ts                request ids, locale routing, strict CSP
```

## Conventions

- **Server by default**. `'use client'` only at leaves that need hooks, state, or browser APIs.
- **Feature-first**. Domain logic goes in `src/features/<feature>/`; `src/app` composes.
- **Two barrels per feature**: `index.ts` (client-safe) and `server.ts` (server-only).
- **Types live with code**; infer from zod schemas where possible.
- **No comments explaining WHAT**. Comments are for non-obvious WHY.
- **Commit style**: Conventional Commits (commitlint). `pnpm commit` for a prompt.

## Quality gates

- `pnpm ci:check` — Biome lint + format + import sort
- `pnpm type-check` — `next typegen` then `tsc --noEmit`
- `pnpm check:deprecated` — fails on any `@deprecated` API use (resolved overloads, aliases followed)
- `pnpm test` — Vitest (CI runs `test:coverage`; thresholds in `vitest.config.ts`)
- `pnpm test:e2e` — Playwright against a production build (CI: Chromium)
- `pnpm validate` — `ci:check` → `type-check` → `check:deprecated` → `test` → `build`
- Husky: `pre-commit` runs `env:sync --check` + lint-staged + type-check; `pre-push` runs `ci:check` + `type-check` + `check:deprecated` + `test`; `commit-msg` runs commitlint.

## Adding a dependency

Check it is needed; prefer native Web, Node, and Next APIs. pnpm refuses packages younger than `minimumReleaseAge`; wait rather than lowering it. Postinstall scripts run only for packages listed in `allowBuilds`. Justify the addition in the PR description.
