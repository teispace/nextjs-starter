# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
