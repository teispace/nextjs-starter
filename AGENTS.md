<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Teispace Next.js Starter

Production-ready App Router template. Next 16, React 19, TypeScript, Tailwind v4, Biome, Redux Toolkit, next-intl.

## Stack decisions (don't fight these)

- **Linter/formatter**: Biome only. No ESLint, no Prettier. Config: `biome.json`. Run `yarn lint` / `yarn lint:fix` / `yarn format`. CI uses `yarn ci:check` (`biome ci`).
- **Tests**: Vitest + React Testing Library + jsdom. Co-locate as `*.test.tsx` next to the source file. Use `renderWithProviders` from `test/test-utils.tsx` when the component needs Redux/i18n. Run with `yarn test` (or `yarn test:watch` / `yarn test:coverage`).
- **Env vars**: Always import from `@/lib/env` (validated + coerced at module load via `@teispace/env`, split server/client/shared with a client leak guard), never `process.env.NEXT_PUBLIC_*` directly. Add new vars in `src/lib/env/index.ts` — declare the coercer in the right group (`server` / `client` (must be `NEXT_PUBLIC_`-prefixed) / `shared`), add the key to `runtimeEnv`, AND `.env.example`. Reading a `server` var from a `'use client'` module throws by design.
- **Logging**: Import `logger` from `@/lib/logger` (pino) — never `console.*`. Attach context via `logger.child({ requestId, userId })`. Sensitive keys (token, password, authorization) are auto-redacted at the root, one level deep, and on common header locations (`req`/`res`/`response.headers`) — pino's `*` wildcard is not recursive, so keep log surfaces shallow (scalars, `{ err }`, explicit child bindings).
- **Routing interception**: `src/proxy.ts` (Next 16 replacement for `middleware.ts`). Do NOT create `middleware.ts`.
- **i18n**: `next-intl`. All user-facing routes live under `src/app/[locale]/`. Locale config in `src/i18n/routing.ts`; request config in `src/i18n/request.ts`. Locale types in `src/types/i18n.ts`.
- **State**: Redux Toolkit + redux-persist. Store assembled in `src/store/`. Use typed hooks from `src/store/hooks.ts`, never raw `useDispatch`/`useSelector`. The `ws` slice (`src/store/slices/ws.slice.ts`) is ephemeral — not persisted.
- **Theme**: `@teispace/next-themes` (drop-in replacement for the unmaintained `next-themes`). Provider in `src/providers/CustomThemeProvider.tsx`.
- **HTTP**: Dual clients (`fetchClient`, `axiosClient`) in `src/lib/utils/http/`. Universal entry is `@/lib/utils/http`; Server Components needing cookie forwarding import from `@/lib/utils/http/server`. Errors as typed `ApiException` from `src/lib/errors/` — clients never throw, returns land in `Either<ApiException, T>`. See `src/lib/utils/http/README.md`.
- **WebSocket**: Typed Socket.IO client in `src/lib/utils/ws/`. Import from `@/lib/utils/ws` only — `shared/`, `client/internals`, and `redux/bridge` are private. Browser-only; opening a socket from a Server Component throws. See `src/lib/utils/ws/README.md`.
- **Secure storage**: `react-secure-storage` wrapped in `src/services/storage/secure-storage.service.ts`. Never call the library directly.
- **Auth mode**: `SAVE_AUTH_TOKENS` (in `src/lib/config/constants.ts`) is derived from `NODE_ENV`, not hardcoded. Bearer/localStorage tokens are used ONLY in `development`/`test`; every deployed build (`next build` forces `NODE_ENV=production`, including staging) uses HttpOnly cookies. The token store is inert in cookie mode, and the secure-storage service throws if a write is attempted there. Cookie topology assumes frontend and API share a registrable domain (set the backend `COOKIE_DOMAIN=.example.com`, `SameSite=strict/lax`) — no CSRF token needed. A cross-site SPA/API split would instead require backend `COOKIE_SAMESITE=none` + credentialed CORS + CSRF protection.
- **Import alias**: `@/*` → `src/*`.

## Directory layout

```
src/
  app/              App Router (root-level pages: robots.ts, sitemap.ts, global-error.tsx, not-found.tsx)
  app/[locale]/     Localized routes (layout, page, error, not-found)
  components/       Shared, cross-feature components
  features/         Feature folders (components/, hooks/, store/, types/) — see features/README.md
  i18n/             next-intl config (routing, request, navigation, translations/)
  lib/
    config/         API base, app paths, locales, constants, SEO
    enums/          Cross-cutting enums (Environment, ...)
    env/            Zod-validated env schema + cached loader
    errors/         ApiException + catch helpers
    logger/         Pino logger + redaction constants
    utils/
      http/         Dual HTTP clients on a shared foundation (universal + server entries)
      ws/           Typed Socket.IO client + hooks + Redux bridge
    validations/    Reusable zod schemas
  providers/        RootProvider (the only advertised mount point) + Store/Theme providers
  proxy.ts          Edge proxy (Next 16 replacement for middleware.ts)
  services/storage/ react-secure-storage wrapper
  store/            Redux store, persistor, hooks, rootReducer, slices/, SSR-safe storage
  styles/           Global CSS
  types/            Shared TS types (common/, utility/, i18n)
```

## Conventions

- **Server by default**. Mark client components with `'use client'` only when needed (hooks, state, browser APIs).
- **Feature-first**. New domain logic goes in `src/features/<feature>/`, not scattered across `components/` + `store/`.
- **Types live with code**. Feature types in `features/<feature>/types/`; cross-cutting types in `src/types/`.
- **No comments explaining WHAT**. Code should read itself. Comments are reserved for non-obvious WHY.
- **Commit style**: Conventional Commits, enforced by commitlint. Use `yarn commit` for a guided prompt.

## Quality gates

- `yarn ci:check` — Biome lint + format + import sort (CI-optimized)
- `yarn type-check` — `tsc --noEmit`
- `yarn check:deprecated` — fails if any code uses an `@deprecated` API (uses the TS compiler API; catches what `tsc` hides at suggestion-level)
- `yarn test` — Vitest run (CI uses this too)
- `yarn validate` — full pipeline (`ci:check` → `type-check` → `check:deprecated` → `test` → `build`)
- `yarn build` — production build
- `yarn analyze` — bundle analyzer (ANALYZE=true)
- Husky hooks: `pre-commit` runs `env:sync` + lint-staged + type-check; `pre-push` runs `ci:check` + `type-check` + `check:deprecated` + `test` (build is left to CI); `commit-msg` runs commitlint.

## Adding a dependency

Check it's actually needed — this starter intentionally keeps the dep list tight. Prefer native Web/Node/Next APIs. When you do add one, justify it in the PR description.
