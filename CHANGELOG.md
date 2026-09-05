# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0-alpha.0] — in progress

v2 is a greenfield rebuild on a new branch; proven modules were ported, everything else was rewritten. Consumers upgrade through next-maker 5, not by hand.

### Breaking

- **Toolchain**: pnpm 11 (with `minimumReleaseAge` and `allowBuilds`), TypeScript 7 (`tsc`) with the 6.x API from `@typescript/typescript6` for the deprecated-API scan, Vitest 5 split into `node` and `jsdom` projects, Biome 2.5.12, ESM project (`"type": "module"`), Node 24 running scripts natively (tsx removed). Renovate replaces Dependabot.
- **Next 16.3**: `cacheComponents`, `partialPrefetching`, and `typedRoutes` are on; `experimental.taint` is enabled. `next typegen` runs before `tsc`.
- **HTTP layer moved to `src/lib/http`** and rewritten on one core with pluggable adapters. `fetch` is the universal default; `axiosAdapter` (`@/lib/http/adapters/axios`) is an opt-in transport on the same contract and never enters a bundle unless imported. Results are a plain `{ ok, data } | { ok, error }` union (`@/types`) instead of `Either` classes; errors are `HttpError` (was `ApiException`) with a serialisable `toPlain()`. New: body-type-aware requests (FormData, Blob, streams pass through; falsy JSON values are sent), `204`/empty bodies resolve to `undefined`, bounded retries with jitter and `Retry-After` for idempotent methods, optional per-call `schema` validation (`ERR_RESPONSE_INVALID`), `skipAuth`, and Next `next` fetch options.
- **Auth is cookie-only in every environment.** Bearer/localStorage mode, `SAVE_AUTH_TOKENS`, `react-secure-storage`, and the token store are gone. The browser refreshes a session once on 401 through the new same-origin `POST /api/auth/refresh` Route Handler, which forwards cookies to the API and relays `Set-Cookie`; the server never refreshes. `API_INTERNAL_URL` lets containers reach the API over a private network.
- **WebSocket layer moved to `src/lib/ws`**, cookie-only with an optional `auth` provider for token handshakes; the dead token-renew surface is removed; the bridge is idempotent and now records `anonymous`.
- **Persistence**: `redux-persist` and `PersistGate` are replaced by listener-middleware persistence in `src/store/persistence.ts` (versioned envelopes, forward migrations, debounced writes, `pagehide` flush, `useAppHydrated`). The root reducer uses `combineSlices` for lazy slice injection.
- **i18n**: locale comes from `next/root-params`; `setRequestLocale` and the `[locale]` guards in layouts and pages are gone. Shared `formats` are typed through `AppConfig`.
- **Theme**: `@teispace/next-themes` 3 rendered from the server layout with the anti-flash script in `<head>` and the Tailwind preset; `CustomThemeProvider` is removed.
- **Env**: `@teispace/env` 1.0; `NEXT_PUBLIC_APP_URL` uses `devDefault` and is required in production builds; server variables are no longer listed in `runtimeEnv`.
- **Security**: `src/lib/security` builds the headers and CSP. `CSP_MODE=static` (default) keeps pages prerenderable; `CSP_MODE=nonce` is the strict per-request policy from the proxy. `X-XSS-Protection` is removed; `Permissions-Policy` and `Cross-Origin-Opener-Policy` are added.
- **Testing**: MSW-backed integration tests for the HTTP core over both adapters, proxy matcher tests via Next's testing helpers, coverage thresholds as a ratchet, and Playwright end-to-end tests against a production build (`pnpm test:e2e`, Chromium in CI).
- **Docker**: pnpm multi-stage build with a store cache, health check, and declared build args. Standalone output is opt-in through `BUILD_STANDALONE=true` (the Dockerfile sets it); `pnpm start` works again for everyone else.

### Added

- **Data layer**. `src/lib/query` wraps TanStack Query 5: a request-scoped `QueryClient` on the server and a per-tab one in the browser, `prefetchQuery` (failures are left to the client), `HydrateQueries`, and `unwrapForQuery` to bridge the transport's `Result`. `src/lib/actions` wraps next-safe-action 8 with `actionClient` (input validation, request id, timing log, `HttpError` mapped to a plain `ActionError`, unknown errors never echoed) and `authActionClient` (loads the session, refuses anonymous callers with a 401 `ActionError`). `src/lib/auth` holds `getCurrentUser` (React-`cache`d, never `use cache`d), `requireUser` (redirects to sign-in with a return path), and `relaySetCookies` so Server Actions can replay the API's `Set-Cookie` headers.
- **Reference feature `src/features/account`** shows the full shape: `api/schema.ts` (zod contracts, inferred types), `api/server.ts` (`use cache` + `cacheTag` DAL over `publicServerHttp`), `api/actions.ts` (`signOut` through `authActionClient`), `api/queries.ts` (`queryOptions` + `useSuspenseQuery`), server and client components, a client-safe `index.ts` and a `server.ts` barrel, and unit, component, and end-to-end tests. Route groups `(marketing)` and `(app)` with a `/dashboard` page gated by `requireUser`.
- `publicServerHttp` (`@/lib/http/server`): the server client without cookie or request-id forwarding, the only one safe inside `use cache` and static prerenders. `RequestOptions.onResponse` exposes the final response for header-only consumers.
- `HttpClient` resolves cookie and request-id headers outside its transport error handling, so Next's prerender interrupts propagate instead of being logged as network failures.
- `getServerApiBaseUrl` resolves against `NEXT_PUBLIC_APP_URL` when no API origin is configured, because a relative `/api` cannot be fetched from the server.
- `pnpm typegen` runs `next typegen` in development mode unless `NODE_ENV` is set, so a fresh clone type-checks without a `.env` file.
- **Metadata**: `src/app/manifest.ts`, generated `icon.png` / `apple-icon.png` (`pnpm icons`, replace with real artwork), a `viewport` export with light/dark `themeColor` and `colorScheme`, and `src/lib/seo` with a `JsonLd` component plus `websiteJsonLd` / `organizationJsonLd` / `breadcrumbJsonLd` builders (script-safe serialisation).
- `pnpm check:deprecated` judges calls by the overload TypeScript actually resolved and follows import aliases, so a deprecated re-export is caught while a library that deprecates one overload of a DOM method no longer trips the gate.
- **Docs**: rewritten for v2: `README.md`, `AGENTS.md`, `docs/structure.md`, `docs/data-layer.md`, `docs/ui-libraries.md`, `docs/migrating-from-1.x.md`, `docs/adr/`, and the HTTP, WebSocket, i18n, and feature guides.
- **Observability**: `src/instrumentation.ts` logs every uncaught server error with its digest, route, and request id through pino (`onRequestError`), never the headers. The proxy stamps `X-Request-Id` on every request and response (a well-formed incoming id is kept), so the render, the server HTTP client, and the API share one id; `getRequestLogger()` (`@/lib/logger/request`) returns a child logger bound to it.

## [1.1.0] — Unreleased on the 1.x line

### Security

- **HTTP clients never refresh tokens on the server.** The refresh singleflight is process-wide and keyed only by upstream URL, so during SSR a refresh triggered by one user's 401 could be awaited by another user's concurrent 401 and the second request retried with the first user's token. Both clients now return a 401 as a value on the server with no refresh, no retry, and no shared state. Regression test in `src/lib/utils/http/server-refresh.test.ts`.
- Bumped `next` and `@next/bundle-analyzer` to 16.3.4 (clears nine advisories against 16.2.9, including a proxy bypass affecting single-locale Turbopack apps).

### Fixed

- Open Graph and Twitter cards pointed at `/og-image.png`, which was never shipped. A default card is now rendered by `src/app/opengraph-image.tsx` and referenced explicitly as `/opengraph-image` from the layout and `generateSEOMetadata`.
- The proxy matcher only excluded metadata routes that carried a file extension, so the extensionless `/opengraph-image` (and `twitter-image`, `icon`, `apple-icon`) routes were rewritten under the locale and returned 404. The matcher now excludes them with or without an extension, and `src/proxy.test.ts` locks the matcher in against Next's `unstable_doesMiddlewareMatch` helper.
- The root `not-found.tsx` renders outside the locale layout and had no `metadataBase`, which made `next build` warn while resolving the Open Graph image URL. It now exports its own metadata.
- The unauthorized redirect targeted `/auth/login`, which had no page. A localized placeholder page now exists at `src/app/[locale]/auth/login/page.tsx` and safely echoes `redirectTo`.
- Docker: declared `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` as build args so they are inlined into the client bundle; removed the `COPY .yarn` step that failed on a fresh clone; set `HOSTNAME=0.0.0.0` so the standalone server is reachable; added `.next`, `coverage`, and `.yarn` to `.dockerignore`.
- `yarn test:coverage` failed with a missing provider; `@vitest/coverage-v8` is now a devDependency.
- Added a `packageManager` pin so Corepack selects Yarn 4 automatically (a global Yarn 1 previously failed on the lockfile).

### Added

- **HTTP layer overhaul (`src/lib/utils/http/`)**: dual `fetchClient` / `axiosClient` on a shared foundation (`shared/` — request-id, response-parser, runtime, search-params). Cookie-mode auth by default with a one-flag flip to bearer; automatic `X-Request-Id` correlation; standard response envelope; offset and cursor pagination types; typed `{ params }` query objects (no manual `URLSearchParams`); single `parseApiError` pipeline; `createFetchClient` / `createAxiosClient` factories for custom upstreams. See `src/lib/utils/http/README.md`.
- **HTTP universal/server entry split**: `@/lib/utils/http` is universal (browser/RSC-safe), `@/lib/utils/http/server` is server-only and forwards cookies via `next/headers`. The split keeps `next/headers` out of the client bundle and uses `server-only` to fail the build if violated. A `'use client'` regression sentinel (`__bundle-sentinel__/`) is mounted from `app/[locale]/layout.tsx` to catch leaks at build time.
- **WebSocket layer (`src/lib/utils/ws/`)**: typed Socket.IO client for a `/ws` gateway. Cookie/bearer auth, application-level heartbeat, reconnection with `auth:force:disconnect` policy enforcement, anonymous-mode opt-in, hard SSR boundary (`WsSsrError`). React hooks (`useWsStatus`, `useWsEvent`, `useWsEmit`) with lazy connect on first subscribe. Connection state flows into a non-persisted Redux slice (`src/store/slices/ws.slice.ts`) via `attachWsBridge`. See `src/lib/utils/ws/README.md`.
- **Co-located unit tests** for the HTTP and WS layers — `*.test.ts(x)` next to the source. `test/setup.ts` stubs `react-secure-storage` (canvas-free) and `server-only` (no-op) so unit tests can reach server-side modules.

### Removed

- Empty scaffolding directories (`src/features/auth/`, `src/features/dashboard/`, `src/app/[locale]/auth/`, `src/app/[locale]/dashboard/`, `src/app/auth/`, `src/services/api/`). They had no real code and were drifting away from what the docs described.

### Changed

- **Tooling**: Replaced ESLint + Prettier + `prettier-plugin-tailwindcss` with [Biome](https://biomejs.dev) (`@biomejs/biome`). One tool now handles linting, formatting, and import sorting. Dropped `eslint.config.mjs`, `.prettierrc`, `.prettierignore`; added `biome.json`. CI runs a single `biome ci` step. Existing code style preserved (single quotes, semicolons, 100-col, trailing commas, LF).
- **Theme library**: Replaced unmaintained `next-themes` with [`@teispace/next-themes`](https://www.npmjs.com/package/@teispace/next-themes) (drop-in compatible, same props).
- **Redux store (large-scale pattern)**: `makeStore` now accepts optional `preloadedState` for Server Component → Redux hydration. `StoreProvider` uses `useRef` (fresh store per request, stable per mount) and wraps children in `PersistGate` with `loading={children}` for non-blocking SSR. `RootProvider` is the single advertised mount point; `StoreProvider` is no longer re-exported from the `@/providers` barrel.
- **redux-persist SSR**: Added `src/store/storage.ts` — a cross-env storage that returns real `localStorage` on the client and a typed no-op on the server. Eliminates the "failed to create sync storage, falling back to noop" warning.
- **TypeScript**: Upgraded from `5.9.3` to `6.0.3`. No code changes required — `tsconfig.json` already set the flags TS 6 changed the defaults for.
- **VSCode defaults**: `biomejs.biome` is now the default formatter; ESLint/Prettier moved to `unwantedRecommendations`.
- **CI**: Collapsed the separate lint + format-check steps into a single `yarn ci:check` step.
- **Hooks**: `pre-commit` lint-staged now runs a single `biome check --write` over all staged file types.

### Added

- **Deprecated API scanner** (`scripts/check-deprecated.ts`, `yarn check:deprecated`): walks every identifier via the TypeScript compiler API and fails if any resolved symbol carries a `@deprecated` JSDoc tag. Wired into `yarn validate` and CI. Catches deprecations that `tsc --noEmit` suppresses (they are suggestion-level, not errors).
- `AGENTS.md` with the Next 16 "not the Next.js you know" preamble plus project-specific orientation (stack decisions, directory layout, conventions, quality gates).
- `CLAUDE.md` importing `AGENTS.md` (standard `create-next-app@16` pattern).
- Missing peer dep `redux@^5.0.1` (required by `react-redux` and `redux-persist`).
- **Env validation** (`src/lib/env/`): zod schema + shared `validateConfig` util + cached loader. Throws with a formatted list of failing fields at module load. All `process.env.NEXT_PUBLIC_*` reads replaced with `env.*` imports.
- **Logger** (`src/lib/logger/`): pino with environment-aware transport (pino-pretty in dev, raw JSON via `pino.destination({ sync: false })` in prod, silent in test). Centralized `SENSITIVE_KEYS` / `SENSITIVE_HEADERS` / `SENSITIVE_REDACTION_PATHS` constants. Replaces direct `console.*` calls in the HTTP layer.
- **Tests**: Vitest + React Testing Library + jsdom scaffolding (`vitest.config.ts`, `test/setup.ts`, `test/test-utils.tsx` with `renderWithProviders`). Example Counter component test. New `yarn test`, `yarn test:watch`, `yarn test:coverage` scripts; CI runs tests as a required step.
- **Bundle analyzer**: `@next/bundle-analyzer` wired behind `ANALYZE=true` with a `yarn analyze` script.
- **Dependabot grouping + auto-merge**: patch/minor updates batched per ecosystem; `.github/workflows/dependabot-auto-merge.yml` auto-merges green patch/minor PRs.
- **HTTP types**: new `ApiErrorResponse`, `ApiCursorMeta`, `CursorPaginatedApiResponse`, `BaseQueryParams`, `BaseCursorQueryParams`. `ApiException` gained `code` / `data` / `path` fields and a `fromResponse()` factory.

### Changed (type + runtime alignment)

- `ApiResponse.statusCode` → `status` to match the API envelope.
- `ApiPaginationMeta` now includes `sortBy` and `order`.
- Axios and fetch clients parse the full error envelope (`status`, `message`, `code`, `errors`, `data`, `path`) into `ApiException`.

### Removed

- `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss`, and their config files.
- Redundant `postinstall: husky` script (kept `prepare`).

### Fixed

- A11y: added `type="button"` to five buttons surfaced by Biome's `useButtonType` rule.
- Renamed the default export in `src/app/[locale]/error.tsx` from `Error` → `ErrorPage` (was shadowing the global).
- Converted `forEach` with non-void callback in `src/lib/utils/http/client-utils.ts` to `for…of`.
- Converted static-only `SecureStorageService` class to a module object (same call sites, lint-clean).

## [1.0.0] - 2025-11-24

### Added

- Initial public release of `teispace/nextjs-starter` repository.
