# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

- `AGENTS.md` with the Next 16 "not the Next.js you know" preamble plus project-specific orientation (stack decisions, directory layout, conventions, quality gates).
- `CLAUDE.md` importing `AGENTS.md` (standard `create-next-app@16` pattern).
- Missing peer dep `redux@^5.0.1` (required by `react-redux` and `redux-persist`).

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
