# Teispace Next.js Starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

A server-first App Router template for large Next.js applications. Next 16 with Cache Components, React 19, TypeScript 7, Tailwind v4, pnpm 11. Every layer that a real product needs is present, typed, and tested: data access, mutations, sessions, client caching, state, realtime, i18n, security headers, SEO, observability, Docker, CI.

Most projects should not clone this repository directly. [`@teispace/next-maker`](https://www.npmjs.com/package/@teispace/next-maker) creates a project from it and lets you pick the pieces you need (transport, state, realtime, i18n, package manager, monorepo layout).

## What's included

- **Framework**: Next 16.3 App Router with `cacheComponents`, partial prefetching, typed routes, React Compiler, `proxy.ts` request interception, `next/root-params`.
- **Data layer**: server-first data access with `use cache` + `cacheTag`, typed Server Actions on next-safe-action 8, TanStack Query 5 for client reads with server prefetch and hydration, and a plain `Result` type so nothing throws across boundaries. See [docs/data-layer.md](docs/data-layer.md).
- **HTTP**: one transport-agnostic client with pluggable adapters (`fetch` default, `axios` optional), bounded retries with jitter and `Retry-After`, timeouts, cancellation, request-id correlation, envelope unwrapping, optional zod validation, and `HttpError` with field-level helpers. Universal, server (cookie-forwarding), and public-server entries. See [src/lib/http/README.md](src/lib/http/README.md).
- **Auth**: HttpOnly cookies only. The browser refreshes once on 401 through a same-origin Route Handler that forwards to the API and relays `Set-Cookie`; the server never refreshes. `getCurrentUser` / `requireUser` for Server Components, `authActionClient` for actions, `relaySetCookies` for sign-in and sign-out.
- **State**: Redux Toolkit with `combineSlices`, listener-middleware persistence (versioned, migratable, debounced, flushed on `pagehide`), typed hooks, `useAppHydrated`.
- **Realtime**: typed Socket.IO client with heartbeat, reconnection policy, force-disconnect handling, Redux bridge, and three hooks. Browser-only by construction. See [src/lib/ws/README.md](src/lib/ws/README.md).
- **i18n**: next-intl 4 with locale from root params, shared formats, and static rendering that needs no per-page ceremony. See [src/i18n/README.md](src/i18n/README.md).
- **Security**: CSP builder (`static` prerender-friendly, `nonce` strict, or `off`), `Permissions-Policy`, COOP, `X-Frame-Options`, `nosniff`, sanitised cookie forwarding, server-only modules enforced at build time.
- **SEO**: `generateSEOMetadata` with canonical and hreflang, generated Open Graph card, manifest, generated icons, viewport theme colours, JSON-LD helpers, sitemap and robots.
- **Env**: `@teispace/env` with server / client / shared groups, a client leak guard, and dev defaults that become required in production.
- **Observability**: pino with redaction, `instrumentation.ts` reporting every uncaught server error with its digest and request id, `X-Request-Id` stamped by the proxy and carried through the render and the API call.
- **Quality**: Biome (lint, format, import sort), `tsc` on TypeScript 7, a deprecated-API scan that judges resolved overloads, Vitest 5 with node and jsdom projects, MSW, React Testing Library, Playwright end-to-end against a production build, coverage thresholds, Husky, commitlint, Renovate.
- **Ops**: multi-stage pnpm Dockerfile with a store cache and health check, docker-compose, GitHub Actions (quality, tests, build, e2e).

## Quick start

```bash
pnpm install
cp .env.example .env    # optional in development: every variable has a dev default
pnpm dev
```

Node 24+ and pnpm 11+ are required (`engines` is enforced). Corepack picks the pinned pnpm from `packageManager`.

## Project structure

```
src/
  app/                  App Router: [locale]/(marketing), [locale]/(app), auth, api/, metadata routes
  features/<name>/      api/{schema,server,actions,queries}.ts, components/, store/, index.ts, server.ts
  lib/
    actions/            actionClient + authActionClient (next-safe-action)
    auth/               getCurrentUser, requireUser, relaySetCookies
    http/               HttpClient core, adapters, browser refresh, server entry
    query/              QueryClient factory, prefetch, hydration boundary
    ws/                 Socket.IO client, hooks, Redux bridge
    env/ logger/ errors/ security/ seo/ config/ theme/ i18n helpers
  store/                Redux store, persistence, hooks, slices
  i18n/                 next-intl routing, request config, formats, translations
  providers/            RootProvider (Query + Store + Intl)
  proxy.ts              Locale routing, request ids, optional strict CSP
  instrumentation.ts    Server error reporting
e2e/                    Playwright smoke tests
test/                   Vitest setup and renderWithProviders
scripts/                typegen, env sync, deprecated-API scan, icon generation
```

The full annotated tree is in [docs/structure.md](docs/structure.md).

## How a page gets its data

1. A Server Component reads through the feature's DAL (`features/<name>/api/server.ts`). Public data is a `use cache` function tagged for revalidation; user data goes through `serverHttp`, which forwards the session cookie, under a `<Suspense>` boundary.
2. Anything the client needs to refetch or mutate is exposed as `queryOptions` in `api/queries.ts`. The page calls `prefetchQuery` and wraps the client subtree in `HydrateQueries`; the client hook starts with the data.
3. Mutations are Server Actions in `api/actions.ts`, built with `authActionClient`. They validate input, know the caller, return a plain `ActionError` on failure, relay any API cookies, and revalidate tags.
4. Client-only state that is not server data (UI, preferences, drafts) lives in Redux with per-feature persistence.

The `account` feature is the reference implementation of all four steps, with tests at every level.

## Configuration

Values are validated at module load by `src/lib/env/index.ts`; a misconfiguration fails at startup with a readable list.

| Variable              | Group  | Description                                                                                | Default (dev)           |
| :-------------------- | :----- | :----------------------------------------------------------------------------------------- | :---------------------- |
| `NEXT_PUBLIC_API_URL` | client | Bare origin of the API. The `/api/v1` prefix is added internally. Empty means same-origin. | `(empty)`               |
| `NEXT_PUBLIC_APP_URL` | client | Public URL of this app (canonical and Open Graph URLs). Required in production builds.     | `http://localhost:3000` |
| `API_INTERNAL_URL`    | server | Origin the server uses to reach the API (private network). Falls back to the public URL.   | `(empty)`               |
| `BUILD_STANDALONE`    | server | Emit `.next/standalone` (set by the Dockerfile).                                           | `false`                 |
| `CSP_MODE`            | server | `static`, `nonce`, or `off`.                                                               | `static`                |
| `DEFAULT_TIMEZONE`    | server | IANA time zone for deterministic server rendering.                                         | `UTC`                   |
| `DEFAULT_LOCALE`      | server | Fallback locale.                                                                           | `en`                    |
| `NODE_ENV`            | shared | Set by Next; do not set it by hand.                                                        | `development`           |

Adding a variable: declare it in the right group in `src/lib/env/index.ts`, add client variables to `runtimeEnv`, and add the key to `.env.example`. The pre-commit hook keeps `.env.example` in sync.

## Scripts

| Script                   | What it does                                                                     |
| :----------------------- | :------------------------------------------------------------------------------- |
| `pnpm dev`               | Development server                                                               |
| `pnpm build`             | Production build (`BUILD_STANDALONE=true` for the self-contained server)         |
| `pnpm start`             | Serve the production build                                                       |
| `pnpm analyze`           | Build with the bundle analyzer                                                   |
| `pnpm lint` / `lint:fix` | Biome check (and fix)                                                            |
| `pnpm format`            | Biome format                                                                     |
| `pnpm ci:check`          | `biome ci`, the single check CI runs                                             |
| `pnpm typegen`           | `next typegen` for route types (development mode unless `NODE_ENV` is set)       |
| `pnpm type-check`        | `typegen` then `tsc --noEmit`                                                    |
| `pnpm check:deprecated`  | Fails on any use of an `@deprecated` API                                         |
| `pnpm test`              | Vitest (`test:watch`, `test:coverage`)                                           |
| `pnpm test:e2e`          | Playwright against a production build on port 3100 (`test:e2e:ui` for the UI)   |
| `pnpm validate`          | `ci:check`, `type-check`, `check:deprecated`, `test`, `build`                    |
| `pnpm env:sync`          | Regenerate `.env.example` from `.env`                                            |
| `pnpm icons`             | Regenerate `src/app/icon.png` and `apple-icon.png`                               |
| `pnpm commit`            | Guided Conventional Commit                                                       |

## Documentation

- [Agent and contributor rules](AGENTS.md)
- [Data layer: DAL, actions, queries, caching, auth](docs/data-layer.md)
- [Feature architecture](src/features/README.md)
- [HTTP client](src/lib/http/README.md)
- [WebSocket client](src/lib/ws/README.md)
- [Internationalization](src/i18n/README.md)
- [UI libraries: shadcn/ui, Radix, MUI, Mantine, HeroUI](docs/ui-libraries.md)
- [Migrating from 1.x](docs/migrating-from-1.x.md)
- [Composition manifest for next-maker](docs/composition.md)
- [Architecture decision records](docs/adr/README.md)
- [Full project structure](docs/structure.md)
- [Changelog](CHANGELOG.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow Conventional Commits and are checked by commitlint.

## License

MIT. See [LICENSE](LICENSE).
