# Project structure

Every tracked directory with what lives in it. Test files sit next to their source as `*.test.ts` (node) or `*.test.tsx` (jsdom) and are omitted below.

```
nextjs-starter/
├── .github/
│   ├── ISSUE_TEMPLATE/                 bug, docs, feature, question templates
│   ├── workflows/ci.yml                quality (biome, tsc, deprecated), test (coverage), build, e2e (Chromium)
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                             commit-msg (commitlint), pre-commit, pre-push
├── .vscode/                            Biome as formatter, debug configs, tasks
├── docs/
│   ├── adr/                            architecture decision records
│   ├── data-layer.md                   DAL, actions, queries, caching, session
│   ├── migrating-from-1.x.md
│   ├── structure.md                    this file
│   └── ui-libraries.md                 shadcn/ui, Radix, MUI, Mantine, HeroUI
├── e2e/smoke.spec.ts                   Playwright: home, headers, metadata, auth redirect, 404
├── public/favicon.ico
├── scripts/
│   ├── check-deprecated.ts             fails on @deprecated usage (TS 6 API via @typescript/typescript6)
│   ├── generate-icons.ts               renders src/app/icon.png and apple-icon.png
│   ├── sync-env.ts                     keeps .env.example in sync with .env
│   └── typegen.ts                      `next typegen` with a development NODE_ENV default
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (app)/dashboard/page.tsx        session-gated page (requireUser)
│   │   │   ├── (marketing)/page.tsx            home: counter, prefetched query, session status, JSON-LD
│   │   │   ├── auth/login/page.tsx             sign-in placeholder with safe redirectTo echo
│   │   │   ├── error.tsx                       locale error boundary
│   │   │   ├── layout.tsx                      html/body, theme script, metadata, viewport, providers
│   │   │   ├── not-found.tsx
│   │   │   └── opengraph-image.tsx             default Open Graph card per locale
│   │   ├── api/auth/refresh/route.ts           same-origin session refresh (relays Set-Cookie)
│   │   ├── apple-icon.png, icon.png, favicon.ico
│   │   ├── global-error.tsx
│   │   ├── manifest.ts
│   │   ├── not-found.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/common/              shared, cross-feature components
│   ├── features/
│   │   ├── README.md                   feature layout and rules
│   │   ├── account/                    reference feature
│   │   │   ├── api/                    schema, keys, server (DAL), actions, queries
│   │   │   ├── components/             SignInOptions, SignOutButton (client), SessionStatus (server)
│   │   │   ├── index.ts                client-safe barrel
│   │   │   └── server.ts               server-only barrel
│   │   └── counter/                    Redux + persistence example
│   ├── i18n/
│   │   ├── README.md
│   │   ├── formats.ts                  shared dateTime / number / list formats
│   │   ├── navigation.ts               Link, redirect, useRouter, usePathname, getPathname
│   │   ├── request.ts                  locale from next/root-params, messages, timeZone
│   │   ├── routing.ts
│   │   └── translations/en.json
│   ├── lib/
│   │   ├── actions/                    actionClient, authActionClient, ActionError
│   │   ├── auth/                       session.ts (getCurrentUser, requireUser), cookies.ts (relaySetCookies)
│   │   ├── config/                     api-url, app-apis, app-locales, app-paths, constants, seo
│   │   ├── enums/                      Environment
│   │   ├── env/index.ts                @teispace/env schema (server / client / shared)
│   │   ├── errors/                     AppError, HttpError, ResponseValidationError
│   │   ├── http/
│   │   │   ├── README.md
│   │   │   ├── adapters/               fetch (default), axios (opt-in)
│   │   │   ├── auth/                   browser refresh singleflight, redirectToLogin
│   │   │   ├── core/client.ts          HttpClient
│   │   │   ├── shared/                 request-id, abort, body, headers, response-body, retry, error-mapper
│   │   │   ├── client.ts               `http`
│   │   │   ├── server.ts               `serverHttp`, `publicServerHttp`, cookie/request-id resolvers
│   │   │   ├── types.ts
│   │   │   └── __bundle-sentinel__/    build-time client-bundle guard
│   │   ├── logger/                     pino (index), request.ts (child with request id), request-error.ts
│   │   ├── query/                      client.ts (QueryClient), prefetch.ts, hydrate.tsx, provider.tsx, unwrap.ts
│   │   ├── runtime.ts                  isBrowser / isServer
│   │   ├── security/                   csp.ts, headers.ts, nonce.ts
│   │   ├── seo/json-ld.tsx             JsonLd + schema builders
│   │   ├── theme/config.ts             next-themes script and provider config
│   │   ├── validations/                shared zod schemas
│   │   └── ws/
│   │       ├── README.md
│   │       ├── client/                 WsClient, lazy singleton, lifecycle emitter, types
│   │       ├── hooks/                  useWsStatus, useWsEvent, useWsEmit
│   │       ├── redux/                  bridge, selectors
│   │       ├── shared/                 runtime guard, auth carrier, URL
│   │       ├── types/                  event maps, payloads, disconnect reasons
│   │       └── constants.ts
│   ├── providers/                      RootProvider (Query + Store + Intl), StoreProvider
│   ├── store/
│   │   ├── hooks.ts                    useAppDispatch, useAppSelector, useAppStore, useAppHydrated
│   │   ├── index.ts                    persistence instance, makeStore
│   │   ├── persistence.ts              createPersistence, definePersistence, persist slice
│   │   ├── rootReducer.ts              combineSlices
│   │   ├── slices/ws.slice.ts          ephemeral WS state
│   │   └── storage.ts                  webStorage (SSR-safe), memoryStorage
│   ├── styles/globals.css              Tailwind v4 + next-themes preset
│   ├── types/                          common (api, auth), utility (result), i18n
│   ├── instrumentation.ts              register, onRequestError
│   └── proxy.ts                        request ids, locale routing, optional nonce CSP
├── test/
│   ├── setup.node.ts                   stubs server-only
│   ├── setup.dom.ts                    node setup + jest-dom + cleanup
│   └── test-utils.tsx                  renderWithProviders, TestProviders, makeTestQueryClient
├── .env.example
├── AGENTS.md / CLAUDE.md               coding-agent rules
├── biome.json
├── CHANGELOG.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, LICENSE
├── Dockerfile, docker-compose.yml, .dockerignore
├── next.config.ts                      cacheComponents, typedRoutes, security headers, next-intl, analyzer
├── package.json, pnpm-lock.yaml, pnpm-workspace.yaml, .npmrc, .nvmrc
├── playwright.config.ts
├── postcss.config.mjs
├── renovate.json
├── tsconfig.json
└── vitest.config.ts                    node + jsdom projects, coverage thresholds
```

## How the pieces connect

- A request enters `proxy.ts` (request id, locale, CSP), renders `app/[locale]/layout.tsx` (theme script, providers), then a page in a route group.
- Pages read through feature DALs and prefetch queries; client components read hydrated queries or Redux; mutations go through Server Actions.
- `lib/http` is the only network layer; `lib/auth` and `lib/actions` sit on top of it.
- `instrumentation.ts` reports uncaught server errors with the request id the proxy assigned.

Related: [AGENTS.md](../AGENTS.md), [docs/data-layer.md](data-layer.md), [src/features/README.md](../src/features/README.md).
