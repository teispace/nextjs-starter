# Project Structure

This document provides a comprehensive view of the repository structure. It serves as a reference for contributors and tooling to understand the organization of the codebase.

## Directory Tree

```
nextjs-starter/
├── .github/                                    # GitHub configuration
│   ├── ISSUE_TEMPLATE/                         # Issue templates
│   │   ├── bug_report.md
│   │   ├── config.yml
│   │   ├── documentation.md
│   │   ├── feature_request.md
│   │   └── question.md
│   ├── workflows/                              # GitHub Actions workflows
│   │   └── ci.yml                              # CI/CD pipeline
│   ├── dependabot.yml                          # Dependabot configuration
│   └── PULL_REQUEST_TEMPLATE.md                # Pull request template
│
├── .husky/                                     # Git hooks
│   ├── _/                                      # Husky internal files
│   ├── commit-msg                              # Commit message validation
│   ├── pre-commit                              # Pre-commit checks
│   └── pre-push                                # Pre-push validation
│
├── .vscode/                                    # VS Code workspace settings
│   ├── extensions.json                         # Recommended extensions
│   ├── launch.json                             # Debug configurations
│   ├── settings.json                           # Editor settings
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
│   ├── app/                                    # Next.js app directory
│   │   ├── [locale]/                           # Internationalized routes
│   │   │   ├── layout.tsx                      # Root layout with i18n
│   │   │   └── page.tsx                        # Home page
│   │   ├── favicon.ico                         # App favicon
│   │   └── robots.ts                           # Robots.txt generation
│   │
│   ├── components/                             # Shared UI components
│   │   ├── common/                             # Common reusable components
│   │   │   └── index.ts                        # Common components exports
│   │   └── index.ts                            # Components exports
│   │
│   ├── features/                               # Feature-based modules
│   │   ├── counter/                            # Counter feature example
│   │   │   ├── components/                     # Feature-specific components
│   │   │   │   └── Counter.tsx
│   │   │   ├── hooks/                          # Feature-specific hooks
│   │   │   │   └── useCounter.ts
│   │   │   ├── store/                          # Redux slice and selectors
│   │   │   │   ├── counter.selectors.ts
│   │   │   │   ├── counter.slice.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── persist.ts                  # Persistence configuration
│   │   │   ├── types/                          # Feature type definitions
│   │   │   │   └── counter.types.ts
│   │   │   └── index.ts                        # Feature exports
│   │   └── README.md                           # Features documentation
│   │
│   ├── i18n/                                   # Internationalization
│   │   ├── translations/                       # Translation files
│   │   │   └── en.json                         # English translations
│   │   ├── navigation.ts                       # i18n navigation utilities
│   │   ├── request.ts                          # Server-side i18n
│   │   ├── routing.ts                          # i18n routing configuration
│   │   └── README.md                           # i18n documentation
│   │
│   ├── lib/                                    # Core utilities and configurations
│   │   ├── config/                             # App configuration
│   │   │   ├── app-apis.ts                     # API endpoints
│   │   │   ├── app-locales.ts                  # Locale configuration
│   │   │   ├── app-paths.ts                    # Route paths
│   │   │   ├── constants.ts                    # App constants
│   │   │   └── index.ts
│   │   ├── enums/                              # Enumerations
│   │   │   ├── environment.enum.ts
│   │   │   └── index.ts
│   │   ├── errors/                             # Error handling utilities
│   │   │   ├── api-exception.ts                # API error class
│   │   │   ├── catch-error.ts                  # Error catching utility
│   │   │   └── index.ts
│   │   ├── utils/                              # Utility functions
│   │   │   ├── http/                           # HTTP client utilities
│   │   │   │   ├── axios-client/               # Axios-based client
│   │   │   │   │   ├── axios-client.ts
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interceptors.ts
│   │   │   │   │   └── token-refresh.ts
│   │   │   │   ├── fetch-client/               # Fetch-based client
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── fetch-client.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── interceptors.ts
│   │   │   │   │   └── token-refresh.ts
│   │   │   │   ├── client-utils.ts             # Shared client utilities
│   │   │   │   ├── index.ts
│   │   │   │   ├── token-store.ts              # Token management
│   │   │   │   └── README.md                   # HTTP client documentation
│   │   │   └── index.ts
│   │   └── validations/                        # Validation schemas
│   │       └── index.ts
│   │
│   ├── providers/                              # React context providers
│   │   ├── CustomThemeProvider.tsx             # Theme provider
│   │   ├── RootProvider.tsx                    # Root provider wrapper
│   │   ├── StoreProvider.tsx                   # Redux store provider
│   │   └── index.ts
│   │
│   ├── services/                               # Service layer
│   │   ├── api/                                # API services
│   │   │   └── index.ts
│   │   └── storage/                            # Storage services
│   │       ├── index.ts
│   │       └── secure-storage.service.ts       # Secure storage implementation
│   │
│   ├── store/                                  # Redux store configuration
│   │   ├── hooks.ts                            # Typed Redux hooks
│   │   ├── index.ts                            # Store configuration
│   │   ├── persistor.ts                        # Redux persist configuration
│   │   └── rootReducer.ts                      # Root reducer
│   │
│   ├── styles/                                 # Global styles
│   │   └── globals.css                         # Global CSS
│   │
│   ├── types/                                  # TypeScript type definitions
│   │   ├── common/                             # Common types
│   │   │   ├── api.types.ts                    # API-related types
│   │   │   ├── auth.types.ts                   # Authentication types
│   │   │   ├── http.types.ts                   # HTTP client types
│   │   │   └── index.ts
│   │   ├── utility/                            # Utility types
│   │   │   ├── either.ts                       # Either monad type
│   │   │   ├── result.ts                       # Result type
│   │   │   └── index.ts
│   │   ├── i18n.ts                             # i18n types
│   │   └── index.ts
│   │
│   └── proxy.ts                                # Proxy configuration
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
├── .prettierignore                             # Prettier ignore patterns
├── .prettierrc                                 # Prettier configuration
├── .yarnrc.yml                                 # Yarn configuration
├── CHANGELOG.md                                # Project changelog
├── CODE_OF_CONDUCT.md                          # Code of conduct
├── CONTRIBUTING.md                             # Contributing guidelines
├── Dockerfile                                  # Docker image definition
├── LICENSE                                     # Project license
├── README.md                                   # Project documentation
├── SECURITY.md                                 # Security policy
├── commitlint.config.mjs                       # Commitlint configuration
├── docker-compose.yml                          # Docker Compose configuration
├── eslint.config.mjs                           # ESLint configuration
├── next-env.d.ts                               # Next.js TypeScript declarations
├── next.config.ts                              # Next.js configuration
├── package.json                                # Package dependencies and scripts
├── postcss.config.mjs                          # PostCSS configuration
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

Next.js App Router directory with internationalized routes using the `[locale]` dynamic segment. Contains layouts, pages, and route-level configurations.

### `src/components/`

Shared, reusable UI components that can be used across different features and pages.

### `src/features/`

Feature-based architecture where each feature is self-contained with its own components, hooks, store slices, and types. Follows a modular approach for better code organization.

### `src/i18n/`

Internationalization setup using next-intl, including translation files, navigation utilities, and routing configuration for multi-language support.

### `src/lib/`

Core utilities, configurations, and shared logic including HTTP clients (both Axios and Fetch), error handling, validations, and app-wide constants.

### `src/providers/`

React context providers for theme, Redux store, and other app-wide state management.

### `src/services/`

Service layer for API calls and storage operations, providing abstraction over data fetching and persistence.

### `src/store/`

Redux Toolkit store configuration with typed hooks, root reducer, and persistence setup using redux-persist.

### `src/types/`

Centralized TypeScript type definitions including common types, utility types (Either, Result), and i18n types.

## Architecture Patterns

- **Feature-based Organization**: Features are self-contained modules in `src/features/`
- **Colocation**: Feature-specific code (components, hooks, types) lives together
- **Separation of Concerns**: Clear separation between UI (components), logic (hooks), state (store), and types
- **HTTP Client Flexibility**: Dual HTTP client support (Axios and Fetch) with shared utilities
- **Type Safety**: Comprehensive TypeScript usage with utility types for better type inference
- **Internationalization**: Built-in multi-language support with next-intl
- **Code Quality**: Automated checks with ESLint, Prettier, commitlint, and Git hooks

## Additional Resources

- Feature development guide: `src/features/README.md`
- Internationalization setup: `src/i18n/README.md`
- HTTP client documentation: `src/lib/utils/http/README.md`
- Contributing guidelines: `CONTRIBUTING.md`
