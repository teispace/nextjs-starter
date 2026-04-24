<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Teispace Next.js Starter

Production-ready App Router template. Next 16, React 19, TypeScript, Tailwind v4, Biome, Redux Toolkit, next-intl.

## Stack decisions (don't fight these)

- **Linter/formatter**: Biome only. No ESLint, no Prettier. Config: `biome.json`. Run `yarn lint` / `yarn lint:fix` / `yarn format`. CI uses `yarn ci:check` (`biome ci`).
- **Tests**: Vitest + React Testing Library + jsdom. Co-locate as `*.test.tsx` next to the source file. Use `renderWithProviders` from `test/test-utils.tsx` when the component needs Redux/i18n. Run with `yarn test` (or `yarn test:watch` / `yarn test:coverage`).
- **Env vars**: Always import from `@/lib/env` (zod-validated at module load), never `process.env.NEXT_PUBLIC_*` directly. Add new vars to the schema in `src/lib/env.ts` AND to `.env.example`.
- **Logging**: Import `logger` from `@/lib/logger` (pino) — never `console.*`. Attach context via `logger.child({ requestId, userId })`. Sensitive keys (token, password, authorization) are auto-redacted.
- **Routing interception**: `src/proxy.ts` (Next 16 replacement for `middleware.ts`). Do NOT create `middleware.ts`.
- **i18n**: `next-intl`. All user-facing routes live under `src/app/[locale]/`. Locale config in `src/i18n/routing.ts`; request config in `src/i18n/request.ts`.
- **State**: Redux Toolkit + redux-persist. Store assembled in `src/store/`. Use typed hooks from `src/store/hooks.ts`, never raw `useDispatch`/`useSelector`.
- **Theme**: `@teispace/next-themes` (drop-in replacement for the unmaintained `next-themes`). Provider in `src/providers/CustomThemeProvider.tsx`.
- **HTTP**: axios wrapper in `src/services/api/`. Errors via `src/lib/errors/`.
- **Secure storage**: `react-secure-storage` wrapped in `src/services/storage/secure-storage.service.ts`. Never call the library directly.
- **Import alias**: `@/*` → `src/*`.

## Directory layout

```
src/
  app/              App Router (root-level pages: robots.ts, sitemap.ts, global-error.tsx)
  app/[locale]/     Localized routes
  components/       Shared, cross-feature components
  features/         Feature folders (components/, hooks/, store/, types/) — see features/README.md
  i18n/             next-intl config
  lib/              config, enums, errors, utils, validations
  providers/        Root + nested React providers
  proxy.ts          Edge proxy (Next 16 style; was middleware.ts)
  services/         api, storage
  store/            Redux store, persistor, hooks, rootReducer
  styles/           Global CSS
  types/            Shared TS types (common/, utility/)
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
- Husky hooks: `pre-commit` runs `env:sync` + lint-staged + type-check; `pre-push` runs `validate`; `commit-msg` runs commitlint.

## Adding a dependency

Check it's actually needed — this starter intentionally keeps the dep list tight. Prefer native Web/Node/Next APIs. When you do add one, justify it in the PR description.
