# Project Structure

This document provides a comprehensive view of the repository structure. It serves as a reference for contributors and tooling to understand the organization of the codebase.

## Directory Tree

```
nextjs-starter/
├── .github/                                    # GitHub configuration
│   ├── ISSUE_TEMPLATE/                         # Issue templates
│   │   ├── bug_report.md
│   │   ├── documentation.md
│   │   ├── feature_request.md
│   │   └── question.md
│   ├── workflows/                              # GitHub Actions workflows
│   │   ├── ci.yml                              # ci:check + type-check + check:deprecated + test + build
│   │   └── dependabot-auto-merge.yml           # Auto-merge green patch/minor Dependabot PRs
│   ├── dependabot.yml                          # Dependabot configuration (grouped minor+patch)
│   └── PULL_REQUEST_TEMPLATE.md                # Pull request template
│
├── .husky/                                     # Git hooks
│   ├── _/                                      # Husky internal files
│   ├── commit-msg                              # Commit message validation
│   ├── pre-commit                              # Pre-commit checks
│   └── pre-push                                # Pre-push validation
│
├── .vscode/                                    # VS Code workspace settings
│   ├── extensions.json                         # Recommended extensions (Biome)
│   ├── launch.json                             # Debug configurations
│   ├── settings.json                           # Editor settings (Biome as default formatter)
│   └── tasks.json                              # Task definitions
│
├── .yarn/                                      # Yarn Berry cache and plugins
│   └── install-state.gz                        # Installation state
│
├── docs/                                       # Documentation files
│   └── structure.md                            # This file
│
├── public/                                     # Static assets
│   └── favicon.ico                             # Site favicon
│
├── src/                                        # Source code
│   ├── app/                                    # Next.js App Router
│   │   ├── [locale]/                           # Internationalized routes
│   │   │   ├── error.tsx                       # Per-locale error boundary
│   │   │   ├── layout.tsx                      # Root layout with i18n
│   │   │   ├── not-found.tsx                   # Per-locale 404 page
│   │   │   └── page.tsx                        # Home page
│   │   ├── favicon.ico                         # App favicon
│   │   ├── global-error.tsx                    # Root-level global error boundary
│   │   ├── not-found.tsx                       # Root-level 404
│   │   ├── robots.ts                           # Robots.txt generation
│   │   └── sitemap.ts                          # Sitemap generation
│   │
│   ├── components/                             # Shared UI components
│   │   ├── common/                             # Common reusable components
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── features/                               # Feature-based modules
│   │   ├── counter/                            # Counter feature example
│   │   │   ├── components/
│   │   │   │   ├── Counter.tsx
│   │   │   │   └── Counter.test.tsx
│   │   │   ├── hooks/useCounter.ts
│   │   │   ├── store/                          # Redux slice, selectors, persist config
│   │   │   │   ├── counter.selectors.ts
│   │   │   │   ├── counter.slice.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── persist.ts
│   │   │   ├── types/counter.types.ts
│   │   │   └── index.ts
│   │   └── README.md                           # Feature architecture guide
│   │
│   ├── i18n/                                   # Internationalization (next-intl)
│   │   ├── translations/en.json
│   │   ├── navigation.ts
│   │   ├── request.ts                          # Server-side i18n
│   │   ├── routing.ts                          # Locale routing config
│   │   └── README.md
│   │
│   ├── lib/                                    # Core utilities and configurations
│   │   ├── config/                             # App configuration
│   │   │   ├── api-url.ts                      # getApiBaseUrl() — bare origin + /api/v1
│   │   │   ├── app-apis.ts                     # Backend endpoint paths
│   │   │   ├── app-locales.ts
│   │   │   ├── app-paths.ts
│   │   │   ├── constants.ts                    # API_PREFIX, SAVE_AUTH_TOKENS, env flags
│   │   │   ├── seo.ts                          # SEO/metadata config
│   │   │   └── index.ts
│   │   ├── enums/
│   │   │   ├── environment.enum.ts
│   │   │   └── index.ts
│   │   ├── env/                                # Env validation (zod)
│   │   │   ├── index.ts                        # Cached `env` export
│   │   │   ├── schema.ts                       # Zod schema + coercion helpers
│   │   │   └── validate.ts                     # Shared validator + issue formatter
│   │   ├── errors/                             # Error handling utilities
│   │   │   ├── api-exception.ts
│   │   │   ├── catch-error.ts
│   │   │   └── index.ts
│   │   ├── logger/                             # Pino logger
│   │   │   ├── index.ts                        # Configured logger export
│   │   │   └── constants.ts                    # Levels + sensitive-key redaction paths
│   │   ├── utils/
│   │   │   ├── http/                           # HTTP clients (backend-compatible transport)
│   │   │   │   ├── shared/                     # Universal foundation (client-bundle-safe)
│   │   │   │   │   ├── request-id.ts           # X-Request-Id generation + extractors
│   │   │   │   │   ├── request-id.test.ts
│   │   │   │   │   ├── response-parser.ts      # Single parseApiError for both clients
│   │   │   │   │   ├── response-parser.test.ts
│   │   │   │   │   ├── runtime.ts              # isBrowser / isServer
│   │   │   │   │   ├── runtime.test.ts
│   │   │   │   │   ├── search-params.ts        # Typed query object → URLSearchParams
│   │   │   │   │   ├── search-params.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── axios-client/               # Axios adapter on the shared foundation
│   │   │   │   │   ├── axios-client.ts
│   │   │   │   │   ├── axios-client.test.ts
│   │   │   │   │   ├── client.ts               # Default singleton (universal entry)
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interceptors.ts         # Accepts optional CookieResolver
│   │   │   │   │   ├── token-refresh.ts
│   │   │   │   │   └── token-refresh.test.ts
│   │   │   │   ├── fetch-client/               # Fetch adapter on the shared foundation
│   │   │   │   │   ├── client.ts               # Default singleton (universal entry)
│   │   │   │   │   ├── fetch-client.ts
│   │   │   │   │   ├── fetch-client.test.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interceptors.ts         # Accepts optional CookieResolver
│   │   │   │   │   ├── interceptors.test.ts
│   │   │   │   │   ├── token-refresh.ts
│   │   │   │   │   └── token-refresh.test.ts
│   │   │   │   ├── __bundle-sentinel__/        # `'use client'` regression gate — do not delete
│   │   │   │   │   └── client-bundle-sentinel.tsx
│   │   │   │   ├── client-utils.ts             # TokenRefreshManager + helpers
│   │   │   │   ├── client-utils.test.ts
│   │   │   │   ├── index.ts                    # Universal entry: fetchClient, axiosClient, toSearchParams
│   │   │   │   ├── server.ts                   # Server-only entry: same shape + next/headers cookies
│   │   │   │   ├── token-store.ts              # secureStorageTokenStore (inert in cookie-mode)
│   │   │   │   └── README.md
│   │   │   ├── ws/                             # WebSocket client (Socket.IO, /ws gateway)
│   │   │   │   ├── types/                      # Backend-mirrored event maps + payload shapes
│   │   │   │   │   ├── events.ts               # ClientToServerEvents, ServerToClientEvents
│   │   │   │   │   ├── payloads.ts             # WsErrorPayload, WsTokenRenewedPayload, etc.
│   │   │   │   │   ├── disconnect-reason.ts    # WsDisconnectReason + isReconnectableReason
│   │   │   │   │   └── index.ts
│   │   │   │   ├── shared/                     # Internal: runtime, auth-carrier, URL composer
│   │   │   │   │   ├── runtime.ts              # isBrowser + WsSsrError (hard SSR guard)
│   │   │   │   │   ├── runtime.test.ts
│   │   │   │   │   ├── auth-carrier.ts         # buildHandshakeAuth (cookie vs bearer)
│   │   │   │   │   ├── ws-url.ts               # getWsUrl (origin + namespace)
│   │   │   │   │   └── index.ts
│   │   │   │   ├── client/                     # WsClient class + default singleton
│   │   │   │   │   ├── ws-client.ts            # Lifecycle, heartbeat, force-disconnect
│   │   │   │   │   ├── ws-client.test.ts
│   │   │   │   │   ├── client.ts               # `wsClient` lazy proxy singleton
│   │   │   │   │   ├── lifecycle-emitter.ts    # Internal typed event emitter
│   │   │   │   │   ├── types.ts                # WsStatus, WsClientOptions, WsConnectOptions
│   │   │   │   │   └── index.ts
│   │   │   │   ├── redux/                      # Bridge + selectors (slice lives in store/slices)
│   │   │   │   │   ├── bridge.ts               # attachWsBridge — only path that dispatches to ws slice
│   │   │   │   │   ├── bridge.test.ts
│   │   │   │   │   ├── selectors.ts            # selectWsStatus, selectWsIsConnected, ...
│   │   │   │   │   └── index.ts
│   │   │   │   ├── hooks/                      # React hooks
│   │   │   │   │   ├── use-ws-status.ts        # Read connection state from Redux
│   │   │   │   │   ├── use-ws-status.test.tsx
│   │   │   │   │   ├── use-ws-event.ts         # Subscribe with lazy connect on first mount
│   │   │   │   │   ├── use-ws-event.test.tsx
│   │   │   │   │   ├── use-ws-emit.ts          # Typed emit accessor
│   │   │   │   │   ├── use-ws-emit.test.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── __test-utils__/             # FakeSocket helper used by WS unit tests
│   │   │   │   │   └── fake-socket.ts
│   │   │   │   ├── constants.ts                # WS_NAMESPACE, WS_HEARTBEAT_INTERVAL_MS, etc.
│   │   │   │   ├── index.ts                    # Public surface
│   │   │   │   └── README.md
│   │   │   └── index.ts
│   │   └── validations/
│   │       └── index.ts
│   │
│   ├── providers/                              # React context providers
│   │   ├── CustomThemeProvider.tsx             # @teispace/next-themes wrapper
│   │   ├── RootProvider.tsx                    # Public root composition (only advertised mount point)
│   │   ├── StoreProvider.tsx                   # Redux store + PersistGate (internal)
│   │   └── index.ts
│   │
│   ├── services/                               # Service layer
│   │   └── storage/                            # Storage services
│   │       ├── index.ts
│   │       └── secure-storage.service.ts       # react-secure-storage wrapper
│   │
│   ├── store/                                  # Redux store configuration
│   │   ├── hooks.ts                            # Typed Redux hooks
│   │   ├── index.ts                            # makeStore (accepts preloadedState)
│   │   ├── persistor.ts                        # Redux-persist setup
│   │   ├── rootReducer.ts                      # Root reducer (ws slice NOT persisted)
│   │   ├── slices/
│   │   │   ├── ws.slice.ts                     # WebSocket connection state (ephemeral)
│   │   │   └── ws.slice.test.ts
│   │   └── storage.ts                          # SSR-safe storage (noop on server, localStorage on client)
│   │
│   ├── styles/
│   │   └── globals.css                         # Tailwind v4 global CSS
│   │
│   ├── types/                                  # TypeScript type definitions
│   │   ├── common/
│   │   │   ├── api.types.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── http.types.ts
│   │   │   └── index.ts
│   │   ├── utility/
│   │   │   ├── either.ts
│   │   │   ├── result.ts
│   │   │   └── index.ts
│   │   ├── i18n.ts
│   │   └── index.ts
│   │
│   └── proxy.ts                                # Next 16 proxy (replaces middleware.ts)
│
├── scripts/
│   ├── sync-env.ts                             # Keeps .env.example in sync with .env
│   └── check-deprecated.ts                     # Fails if any code uses an @deprecated API
│
├── test/                                       # Vitest setup + RTL helpers
│   ├── setup.ts                                # Global mocks (react-secure-storage, server-only)
│   └── test-utils.tsx                          # renderWithProviders + TestProviders
│
├── .czrc                                       # Commitizen configuration
├── .dockerignore                               # Docker ignore patterns
├── .editorconfig                               # Editor configuration
├── .env                                        # Environment variables (local)
├── .env.example                                # Environment variables template
├── .gitignore                                  # Git ignore patterns
├── .lintstagedrc.mjs                           # Lint-staged configuration
├── .npmrc                                      # NPM configuration
├── .nvmrc                                      # Node version specification
├── .yarnrc.yml                                 # Yarn configuration
├── AGENTS.md                                   # Coding-agent rules (Next 16 conventions + project orientation)
├── CLAUDE.md                                   # Imports AGENTS.md for Claude Code
├── CHANGELOG.md                                # Project changelog
├── CODE_OF_CONDUCT.md                          # Code of conduct
├── CONTRIBUTING.md                             # Contributing guidelines
├── Dockerfile                                  # Docker image definition
├── LICENSE                                     # Project license
├── README.md                                   # Project documentation
├── SECURITY.md                                 # Security policy
├── biome.json                                  # Biome (lint + format + import sort) config
├── commitlint.config.mjs                       # Commitlint configuration
├── docker-compose.yml                          # Docker Compose configuration
├── next-env.d.ts                               # Next.js TypeScript declarations
├── next.config.ts                              # Next.js configuration (reactCompiler + next-intl + security headers)
├── package.json                                # Package dependencies and scripts
├── postcss.config.mjs                          # PostCSS configuration (Tailwind v4)
├── tsconfig.json                               # TypeScript configuration
└── yarn.lock                                   # Yarn dependency lock file
```

## Key Directories Explained

### `.github/`

Contains GitHub-specific configuration including issue templates, pull request templates, workflows for CI/CD, and Dependabot configuration for automated dependency updates.

### `.husky/`

Git hooks managed by Husky to enforce code quality standards at commit time, including commit message linting and pre-commit/pre-push checks.

### `.vscode/`

VS Code workspace configuration with recommended extensions, debug configurations, editor settings, and task definitions for improved developer experience.

### `src/app/`

Next.js App Router directory with internationalized routes using the `[locale]` dynamic segment. Contains layouts, pages, error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`), and route-level metadata generation (`robots.ts`, `sitemap.ts`).

### `src/components/`

Shared, reusable UI components that can be used across different features and pages.

### `src/features/`

Feature-based architecture where each feature is self-contained with its own components, hooks, store slices, and types. Follows a modular approach for better code organization.

### `src/i18n/`

Internationalization setup using next-intl, including translation files, navigation utilities, and routing configuration for multi-language support.

### `src/lib/`

Core utilities, configurations, and shared logic including HTTP clients (both Axios and Fetch), error handling, validations, and app-wide constants.

### `src/providers/`

React context providers for theme, Redux store, and i18n. `RootProvider` is the single advertised mount point; `StoreProvider` is internal and accepts an optional `preloadedState` for server-pre-populated Redux state.

### `src/proxy.ts`

Edge proxy for request interception (Next 16 replacement for `middleware.ts`).

### `src/services/`

Service layer for storage abstractions. Currently a thin wrapper around `react-secure-storage` (`storage/secure-storage.service.ts`). HTTP and WebSocket transports live under `src/lib/utils/`, not here — `services/` is for code that wraps an external SDK or persistence layer.

### `src/store/`

Redux Toolkit store configuration with typed hooks, root reducer, persistence setup using redux-persist, and a cross-env `storage.ts` that provides real `localStorage` on the client and a no-op on the server (eliminating the redux-persist SSR warning).

### `src/types/`

Centralized TypeScript type definitions including common types, utility types (Either, Result), and i18n types.

## Architecture Patterns

- **Feature-based Organization**: Features are self-contained modules in `src/features/`
- **Colocation**: Feature-specific code (components, hooks, types) lives together
- **Separation of Concerns**: Clear separation between UI (components), logic (hooks), state (store), and types
- **HTTP Client Flexibility**: Dual HTTP client support (Axios and Fetch) with shared utilities
- **Type Safety**: Comprehensive TypeScript usage with utility types for better type inference
- **Internationalization**: Built-in multi-language support with next-intl
- **Per-request Redux store**: `StoreProvider` uses `useRef` to create a fresh store per request (SSR-safe), with optional `preloadedState` for Server Component → Redux hydration
- **Code Quality**: Biome (single tool for lint + format + import sort), commitlint, Husky git hooks, and GitHub Actions CI

## Additional Resources

- Agent/contributor rules: `AGENTS.md` (imported by `CLAUDE.md`)
- Feature development guide: `src/features/README.md`
- Internationalization setup: `src/i18n/README.md`
- HTTP client documentation: `src/lib/utils/http/README.md`
- WebSocket client documentation: `src/lib/utils/ws/README.md`
- Contributing guidelines: `CONTRIBUTING.md`
- Changelog: `CHANGELOG.md`
