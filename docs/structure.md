# Project Structure (full)

This document contains a full, expanded view of the repository layout and short descriptions for key folders and files. It mirrors the detailed tree previously included in the top-level `README.md` so tooling or contributors can reference the complete structure in one place.

```
nextjs-starter/
│
├── .github/                                    # GitHub configuration
│   ├── ISSUE_TEMPLATE/                         # Issue templates
│   │   ├── bug_report.md
│   │   ├── config.yml
│   │   ├── documentation.md
│   │   ├── feature_request.md
│   │   └── question.md
│   ├── workflows/                              # GitHub Actions workflows
│   │   └── ci.yml                              # Continuous Integration pipeline
# Project Structure (full)

This document contains an accurate, expanded view of the repository layout (current state of the codebase) and short descriptions for key folders and files. It is kept separate from the top-level `README.md` to avoid long README content while preserving a full tree for contributors and tooling.
```

# Project Structure (full)

This document contains an accurate, expanded view of the repository layout (current state of the codebase) and short descriptions for key folders and files. It is kept separate from the top-level `README.md` to avoid long README content while preserving a full tree for contributors and tooling.

```
nextjs-starter/
├ .github/
├ .husky/
├ .vscode/
├ .yarn/
├ public/
├ src/
│  ├ app/
│  │  ├ [locale]/
│  │  │  ├ layout.tsx
│  │  │  └ page.tsx
│  │  ├ favicon.ico
│  │  └ robots.ts
│  ├ components/
│  │  ├ common/
│  │  │  └ index.ts
│  │  ├ Count.tsx
│  │  └ index.ts
│  ├ features/
│  │  ├ counter/
│  │  │  ├ components/
│  │  │  │  └ Counter.tsx
│  │  │  ├ hooks/
│  │  │  │  └ useCounter.ts
│  │  │  ├ store/
│  │  │  │  ├ counter.selectors.ts
│  │  │  │  ├ counter.slice.ts
│  │  │  │  ├ index.ts
│  │  │  │  └ persist.ts
│  │  │  ├ types/
│  │  │  │  └ counter.types.ts
│  │  │  └ index.ts
│  │  └ README.md
│  ├ i18n/
│  │  ├ translations/
│  │  │  └ en.json
│  │  ├ navigation.ts
│  │  ├ request.ts
│  │  ├ routing.ts
│  │  └ README.md
│  ├ lib/
│  │  ├ config/
│  │  │  ├ app-apis.ts
│  │  │  ├ app-locales.ts
│  │  │  ├ app-paths.ts
│  │  │  ├ constants.ts
│  │  │  └ index.ts
│  │  ├ enums/
│  │  │  ├ environment.enum.ts
│  │  │  └ index.ts
│  │  ├ errors/
│  │  │  ├ api-exception.ts
│  │  │  ├ catch-error.ts
│  │  │  └ index.ts
│  │  ├ utils/
│  │  │  ├ http/
│  │  │  │  ├ README.md
│  │  │  │  ├ axios-client/
│  │  │  │  │  ├ axios-client.ts
│  │  │  │  │  ├ client.ts
│  │  │  │  │  ├ interceptors.ts
│  │  │  │  │  ├ token-refresh.ts
│  │  │  │  │  └ index.ts
│  │  │  │  ├ fetch-client/
│  │  │  │  │  ├ client.ts
│  │  │  │  │  ├ fetch-client.ts
│  │  │  │  │  ├ interceptors.ts
│  │  │  │  │  ├ token-refresh.ts
│  │  │  │  │  └ index.ts
│  │  │  │  ├ client-utils.ts
│  │  │  │  ├ token-store.ts
│  │  │  │  └ index.ts
│  │  │  └ index.ts
│  │  └ validations/
│  │     └ index.ts
│  ├ providers/
│  │  ├ CustomThemeProvider.tsx
│  │  ├ RootProvider.tsx
│  │  ├ StoreProvider.tsx
│  │  └ index.ts
│  ├ services/
│  │  ├ api/
│  │  │  └ index.ts
│  │  └ storage/
│  │     ├ index.ts
│  │     └ secure-storage.service.ts
│  ├ store/
│  │  ├ hooks.ts
│  │  ├ index.ts
│  │  ├ persistor.ts
│  │  └ rootReducer.ts
│  ├ styles/
│  │  └ globals.css
│  ├ types/
│  │  ├ common/
│  │  │  ├ api.types.ts
│  │  │  ├ auth.types.ts
│  │  │  ├ http.types.ts
│  │  │  └ index.ts
│  │  ├ utility/
│  │  │  ├ either.ts
│  │  │  ├ result.ts
│  │  │  └ index.ts
│  │  ├ i18n.ts
│  │  └ index.ts
│  └ proxy.ts
├ docs/
├ Dockerfile
├ docker-compose.yml
├ package.json
├ postcss.config.mjs
├ README.md
├ SECURITY.md
├ tsconfig.json
└ yarn.lock
```

Legend:

- The tree above is a monospace listing of files and directories. Comments and long inline descriptions were removed to keep alignment stable in editors and viewers.

For brief descriptions of important folders see the top-level `README.md` or the specific `README.md` files under `src/features/` and `src/i18n/`.

_Updated to use consistent indentation and avoid inline comments that cause wrapping._
