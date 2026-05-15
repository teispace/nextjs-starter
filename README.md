# Next.js Starter Template.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

A production-ready, feature-packed starter template for Next.js applications. Built with modern web development best practices and tools to jumpstart your next project.

## ✨ What's included

- **Framework** — Next.js 16 (App Router, React Compiler, `proxy.ts` edge interception), React 19, TypeScript 6, Tailwind v4.
- **i18n** — `next-intl` with locale-scoped routes under `src/app/[locale]/`, server-configured `timeZone` to avoid hydration mismatches.
- **State** — Redux Toolkit + redux-persist with a per-request store (`useRef`-based), SSR-safe storage (`src/store/storage.ts`), and `preloadedState` support for Server Component → Redux hydration.
- **HTTP** — dual clients (`fetchClient` + `axiosClient`) on a shared foundation (`src/lib/utils/http/shared/`): runtime-aware cookie forwarding (browser jar in CSR, `next/headers` injection in RSC), automatic `X-Request-Id` correlation with the backend, single `parseApiError` error pipeline, cookie-mode auth by default with a one-flag flip to bearer-mode. Backend-compatible response envelope, pagination (offset + cursor), and base query types ship out of the box.
- **WebSocket** — typed Socket.IO client (`src/lib/utils/ws/`) matching the NestJS-starter `/ws` gateway: cookie or bearer auth (reuses `SAVE_AUTH_TOKENS`), application-level heartbeat, reconnection with `auth:force:disconnect` policy enforcement (server-flagged `reconnectable` boolean), public/anonymous mode opt-in, Redux slice for connection state (not persisted), three hooks (`useWsStatus`, `useWsEvent`, `useWsEmit`) with lazy connect, hard SSR boundary.
- **Env validation** — zod-validated, cached at module load (`src/lib/env/`). Add a variable in one place and type-safety, validation, and coercion flow everywhere.
- **Logger** — pino with env-aware transports (pretty in dev, JSON to stdout in prod, silent in test) and automatic redaction of tokens / passwords / auth headers.
- **Theme** — `@teispace/next-themes` (drop-in replacement for the unmaintained `next-themes`).
- **Quality** — Biome (lint + format + import sort in one tool), Husky + lint-staged, commitlint + commitizen, a custom `yarn check:deprecated` that fails on any use of an `@deprecated` API.
- **Testing** — Vitest + React Testing Library + jsdom with a provider-wrapped `renderWithProviders` helper and a working Counter example.
- **DX** — bundle analyzer, Docker + docker-compose, GitHub Actions CI, Dependabot with auto-merge for patch/minor updates, `AGENTS.md` + `CLAUDE.md` for coding-agent instructions.

## 📂 Project Structure (short)

```
nextjs-starter/
├─ public/                      # Static assets (images, favicon)
├─ scripts/                     # Dev scripts (env sync, deprecated scanner)
├─ src/                         # Application source
│  ├─ app/                      # Next.js App Router (per-locale routes, error boundaries, sitemap/robots)
│  ├─ components/               # Shared UI components and barrels
│  ├─ features/                 # Feature-driven modules (counter example)
│  ├─ i18n/                     # Internationalization (translations + routing)
│  ├─ lib/                      # Config, env, logger, errors, http clients, utils, validations
│  ├─ providers/                # React providers (root/store/theme)
│  ├─ services/                 # API & storage services
│  ├─ store/                    # Redux store, persistor, typed hooks, SSR-safe storage
│  ├─ styles/                   # Global CSS / Tailwind
│  ├─ types/                    # Global TypeScript types
│  └─ proxy.ts                  # Next 16 edge proxy (replaces middleware.ts)
├─ test/                        # Vitest setup + RTL `renderWithProviders`
├─ .github/, .husky/, .vscode/  # CI, git hooks, editor configs
├─ Dockerfile, docker-compose.yml
├─ biome.json, vitest.config.ts
├─ package.json, tsconfig.json, next.config.ts
└─ README.md, AGENTS.md, CLAUDE.md, LICENSE, CHANGELOG.md
```

For deeper detail see `docs/structure.md`, `src/features/README.md`, and `src/i18n/README.md`.

## 📚 Documentation

- **[Agent / contributor rules](AGENTS.md)** — conventions and stack decisions. Imported by `CLAUDE.md` for coding agents.
- **[Full project structure](docs/structure.md)** — every tracked file with a one-line description.
- **[Feature-Based Architecture](src/features/README.md)** — how features are organized and how to add new ones.
- **[Internationalization (i18n)](src/i18n/README.md)** — using translations, adding locales, routing.
- **[HTTP Client](src/lib/utils/http/README.md)** — `fetchClient` / `axiosClient` usage guide.
- **[WebSocket Client](src/lib/utils/ws/README.md)** — `wsClient` + React hooks for the backend's `/ws` gateway.
- **[Changelog](CHANGELOG.md)** — notable changes.

## 🏗️ Architecture

This project follows a **Feature-Based Architecture**. Instead of grouping files by type (components, hooks, services), we group them by **feature** (auth, users, projects).

- **`src/features/`**: Contains all domain logic. Each feature is self-contained.
- **`src/app/`**: The Next.js App Router layer. It should be thin and primarily compose features.
- **`src/components/common/`**: Reusable UI components that are not specific to any feature (e.g., Button, Input).

For more details, read the [Feature Architecture Guide](src/features/README.md).

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` to get started. Values are validated at module load by `src/lib/env/schema.ts` — a misconfiguration fails fast with a readable error listing every invalid field.

```bash
cp .env.example .env
```

| Variable               | Description                                                                        | Default                 |
| :--------------------- | :--------------------------------------------------------------------------------- | :---------------------- |
| `NEXT_PUBLIC_API_URL`  | Bare origin of the backing API (e.g. `https://api.example.com`). The `/api/v{n}` URI-version prefix is appended internally — do not include it here. Empty → relative/proxied requests. | `(empty)`               |
| `NEXT_PUBLIC_APP_URL`  | Public URL this app is served from (used for OG/canonical URLs).                   | `http://localhost:3000` |
| `DEFAULT_TIMEZONE`     | IANA time zone for server-rendered date formatting. Keeps SSR deterministic.       | `UTC`                   |
| `DEFAULT_LOCALE`       | Fallback locale when a request locale cannot be resolved.                          | `en`                    |
| `PORT`                 | Port to run the server on                                                          | `3000`                  |
| `CONTAINER_NAME`       | Name of the Docker container                                                       | `next-app`              |
| `IMAGE_NAME`           | Name of the Docker image                                                           | `nextjs-starter`        |
| `IMAGE_TAG`            | Tag for the Docker image                                                           | `latest`                |

### Internationalization

Supported locales are defined in `src/lib/config/app-locales.ts`. To add a new language, follow the steps in the [i18n Guide](src/i18n/README.md).

### HTTP Client

The HTTP client is pre-configured to handle authentication tokens automatically. See `src/lib/utils/http/README.md` for advanced usage.

## 🧰 Scripts

| Script                   | What it does                                                                        |
| :----------------------- | :---------------------------------------------------------------------------------- |
| `yarn dev`               | Start Next.js dev server                                                            |
| `yarn build`             | Production build                                                                    |
| `yarn start`             | Serve the production build                                                          |
| `yarn analyze`           | Production build with bundle analyzer (`ANALYZE=true`)                              |
| `yarn lint`              | Biome lint + format + import sort (non-mutating)                                    |
| `yarn lint:fix`          | Same as `lint` but applies auto-fixes                                               |
| `yarn format`            | Write-format only                                                                   |
| `yarn ci:check`          | `biome ci` — single-pass check that CI runs                                         |
| `yarn type-check`        | `tsc --noEmit`                                                                      |
| `yarn check:deprecated`  | Fails if any code uses a symbol marked `@deprecated` (TS compiler-API sweep)        |
| `yarn test`              | Vitest run                                                                          |
| `yarn test:watch`        | Vitest watch mode                                                                   |
| `yarn test:coverage`     | Vitest with v8 coverage report                                                      |
| `yarn validate`          | Full pipeline: `ci:check → type-check → check:deprecated → test → build`            |
| `yarn env:sync`          | Regenerate `.env.example` from `.env` keys (strips values from non-`-public` keys)  |
| `yarn commit`            | Guided conventional-commit prompt via commitizen                                    |

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find this project useful, please give it a ⭐️ on GitHub!
