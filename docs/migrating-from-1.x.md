# Migrating from 1.x

v2 is a rebuild. Projects created with next-maker 4 should be upgraded with next-maker 5, which knows which files it generated. This page lists what changed for hand-maintained projects.

## Toolchain

| 1.x                              | 2.x                                                         |
| :------------------------------- | :---------------------------------------------------------- |
| Yarn 4                           | pnpm 11 (`pnpm-workspace.yaml` holds the install policy)    |
| TypeScript 6                     | TypeScript 7 (`tsc`); `@typescript/typescript6` for scripts |
| Vitest 3, single environment     | Vitest 5, `node` + `jsdom` projects                          |
| `tsx` for scripts                | Node 24 runs `.ts` natively                                 |
| Dependabot                       | Renovate                                                    |
| `yarn type-check`                | `pnpm type-check` (runs `next typegen` first)               |

## Imports

| 1.x                                            | 2.x                                                      |
| :--------------------------------------------- | :------------------------------------------------------- |
| `@/lib/utils/http` → `fetchClient`/`axiosClient` | `@/lib/http` → `http` (fetch) or `createHttpClient({ adapter: axiosAdapter() })` |
| `@/lib/utils/http/server`                      | `@/lib/http/server` → `serverHttp`, `publicServerHttp`    |
| `@/lib/utils/ws`                               | `@/lib/ws`                                               |
| `ApiException`                                 | `HttpError` (`@/lib/errors`)                             |
| `Either<ApiException, T>` (`.isLeft()`, `.fold`) | `Result<T>` (`result.ok ? result.data : result.error`) |
| `@/lib/utils/runtime`                          | `@/lib/runtime`                                          |
| `@/services/storage/secure-storage.service`    | removed                                                  |
| `@/providers/CustomThemeProvider`              | removed; `ThemeProvider` is rendered by the server layout |

## Auth

Bearer mode, `SAVE_AUTH_TOKENS`, and the token store are gone. Every environment uses HttpOnly cookies. The browser refreshes through `POST /api/auth/refresh` (a Route Handler in this app) and the server never refreshes. Sign-in and sign-out are Server Actions that call the API and relay its cookies with `relaySetCookies`.

## State

`redux-persist` and `PersistGate` are replaced by `createPersistence` in `src/store/persistence.ts`. Per-feature configs become `definePersistence({ key, version, pick, migrations })` and are listed in `src/store/index.ts`. `useAppHydrated()` replaces reading `persistor` state. The root reducer uses `combineSlices`.

## i18n

`setRequestLocale`, the `locale` param validation in layouts and pages, and `params`-based `generateMetadata` are gone. The locale comes from `next/root-params` in `src/i18n/request.ts`; pages call `getLocale()` / `getTranslations()` directly. Shared formats live in `src/i18n/formats.ts`.

## Rendering

`cacheComponents` is on. Anything that reads request data (`cookies()`, `headers()`, `searchParams`) must be under `<Suspense>`; everything else is part of the static shell. Public data reads use `use cache`. `Date.now()` and `crypto.randomUUID()` outside a cache or request scope fail the build; that is the framework telling you the value is not prerenderable.

## Env

`@teispace/env` 1.0. Server variables are no longer listed in `runtimeEnv`. `NEXT_PUBLIC_APP_URL` is required in production builds. New: `API_INTERNAL_URL`, `CSP_MODE`, `BUILD_STANDALONE`.

## Removed

`src/lib/env/schema.ts`, `catch-error.ts`, `http.types.ts`, `either.ts`, `persistor.ts`, `test/setup.ts` (now `setup.node.ts` and `setup.dom.ts`), the `/og-image.png` reference, `X-XSS-Protection`.
