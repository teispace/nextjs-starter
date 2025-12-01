# Next.js Starter Template.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

A production-ready, feature-packed starter template for Next.js applications. Built with modern web development best practices and tools to jumpstart your next project.

## ⚡ Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/teispace/nextjs-starter.git my-app
   cd my-app
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Setup Environment Variables**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

4. **Run the development server**

   ```bash
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Features

- **[Next.js 16+](https://nextjs.org/)** - The React Framework for the Web (App Router)
- **[TypeScript](https://www.typescriptlang.org/)** - Static type checking
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Redux Toolkit](https://redux-toolkit.js.org/)** - State management
- **[Redux Persist](https://github.com/rt2zz/redux-persist)** - Persist and rehydrate a redux store
- **[Axios](https://axios-http.com/)** - Promise based HTTP client
- **[Next-Intl](https://next-intl-docs.vercel.app/)** - Internationalization for Next.js
- **[Next Themes](https://github.com/pacocoursey/next-themes)** - Dark mode support
- **Code Quality Tools**:
  - **[ESLint](https://eslint.org/)** - Pluggable JavaScript linter
  - **[Prettier](https://prettier.io/)** - Opinionated Code Formatter
  - **[Husky](https://typicode.github.io/husky/)** - Git hooks
  - **[Lint-Staged](https://github.com/okonet/lint-staged)** - Run linters on git staged files
  - **[Commitlint](https://commitlint.js.org/)** - Lint commit messages
  - **[Commitizen](https://commitizen-tools.github.io/commitizen/)** - Interactive commit CLI

## 📦 Prerequisites

- Node.js >= 24.0.0
- Yarn >= 4.0.0

## 🏃‍♂️ Running the Project

### Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Production Build

```bash
yarn build
yarn start
```

### Docker

You can also run the application using Docker.

**Using Docker Compose (Recommended):**

```bash
# Start the container
docker-compose up -d

# Stop the container
docker-compose down
```

**Using Dockerfile:**

```bash
# Build the image
docker build -t nextjs-starter .

# Run the container
docker run -p 3000:3000 nextjs-starter
```

## 📜 Scripts

| Script            | Description                                       |
| :---------------- | :------------------------------------------------ |
| `yarn dev`        | Starts the development server                     |
| `yarn build`      | Builds the application for production             |
| `yarn start`      | Starts the production server                      |
| `yarn lint`       | Runs ESLint to check for linting errors           |
| `yarn lint:fix`   | Runs ESLint and fixes fixable errors              |
| `yarn format`     | Formats code using Prettier                       |
| `yarn type-check` | Runs TypeScript type checking                     |
| `yarn validate`   | Runs lint, type-check, and build (useful for CI)  |
| `yarn commit`     | Starts the interactive commit wizard (Commitizen) |

## 📂 Project Structure

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
│   ├── dependabot.yml                          # Dependabot configuration
│   └── PULL_REQUEST_TEMPLATE.md                # PR template
│
├── .husky/                                     # Git hooks
│   ├── _/                                      # Husky internal files
│   ├── commit-msg                              # Commit message linting hook
│   ├── pre-commit                              # Pre-commit hook (lint-staged)
│   └── pre-push                                # Pre-push hook
│
├── .vscode/                                    # VS Code workspace settings
│   ├── extensions.json                         # Recommended extensions
│   ├── launch.json                             # Debug configurations
│   ├── settings.json                           # Workspace settings
│   └── tasks.json                              # Build/run tasks
│
├── .yarn/                                      # Yarn Berry cache
│   └── install-state.gz                        # Installation state
│

├── public/                                     # Static assets
│   └── favicon.ico                             # Favicon
│
├── src/                                        # Application source code
│   ├── app/                                    # Next.js App Router
│   │   ├── [locale]/                           # Internationalized routes
│   │   │   ├── layout.tsx                      # Locale-specific layout
│   │   │   └── page.tsx                        # Home page
│   │   ├── favicon.ico                         # App favicon
│   │   └── robots.ts                           # Robots.txt configuration
│   │
│   ├── components/                             # Shared UI components
│   │   ├── common/                             # Common/Generic components
│   │   │   └── index.ts                        # Barrel export
│   │   ├── Count.tsx                           # Example component
│   │   └── index.ts                            # Barrel export
│   │
│   ├── features/                               # Domain-driven feature modules
│   │   └── README.md                           # Feature architecture guide
│   │   # Example feature structure:
│   │   # ├── auth/                             # Auth feature
│   │   # │   ├── components/                   # Feature-specific components
│   │   # │   │   ├── login-form.tsx
│   │   # │   │   └── register-form.tsx
│   │   # │   ├── hooks/                        # Feature-specific hooks
│   │   # │   │   └── use-auth.ts
│   │   # │   ├── types.ts                      # Feature-specific types
│   │   # │   └── index.ts                      # Public API
│   │
│   ├── i18n/                                   # Internationalization
│   │   ├── translations/                       # Translation files
│   │   │   └── en.json                         # English translations
│   │   ├── navigation.ts                       # i18n navigation setup
│   │   ├── request.ts                          # Request configuration
│   │   ├── routing.ts                          # Routing configuration
│   │   └── README.md                           # i18n documentation
│   │
│   ├── lib/                                    # Core libraries and utilities
│   │   ├── config/                             # Application configuration
│   │   │   ├── app-apis.ts                     # API endpoints configuration
│   │   │   ├── app-locales.ts                  # Locale configuration
│   │   │   ├── app-paths.ts                    # Route paths configuration
│   │   │   ├── constants.ts                    # Global constants
│   │   │   └── index.ts                        # Barrel export
│   │   │
│   │   ├── enums/                              # Enum definitions
│   │   │   ├── environment.enum.ts             # Environment enum
│   │   │   └── index.ts                        # Barrel export
│   │   │
│   │   ├── errors/                             # Error handling
│   │   │   ├── api-exception.ts                # API error class
│   │   │   ├── catch-error.ts                  # Error catching utilities
│   │   │   └── index.ts                        # Barrel export
│   │   │
│   │   ├── utils/                              # Utility functions
│   │   │   ├── http/                           # HTTP client utilities
│   │   │   │   ├── axios-client/               # Axios implementation
│   │   │   │   │   ├── axios-client.ts         # Axios instance
│   │   │   │   │   ├── client.ts               # Client class
│   │   │   │   │   ├── interceptors.ts         # Request/response interceptors
│   │   │   │   │   ├── token-refresh.ts        # Token refresh logic
│   │   │   │   │   └── index.ts                # Barrel export
│   │   │   │   ├── fetch-client/               # Fetch API implementation
│   │   │   │   │   ├── fetch-client.ts         # Fetch instance
│   │   │   │   │   ├── client.ts               # Client class
│   │   │   │   │   ├── interceptors.ts         # Request/response interceptors
│   │   │   │   │   ├── token-refresh.ts        # Token refresh logic
│   │   │   │   │   └── index.ts                # Barrel export
│   │   │   │   ├── client-utils.ts             # Shared utilities
│   │   │   │   ├── token-store.ts              # Token storage utilities
│   │   │   │   ├── README.md                   # HTTP client documentation
│   │   │   │   └── index.ts                    # Barrel export
│   │   │   └── index.ts                        # Barrel export
│   │   │
│   │   └── validations/                        # Validation schemas (Zod)
│   │       └── index.ts                        # Barrel export
│   │
│   ├── providers/                              # Context providers
│   │   ├── CustomThemeProvider.tsx             # Theme provider (Next Themes)
│   │   ├── RootProvider.tsx                    # Root provider wrapper
│   │   ├── StoreProvider.tsx                   # Redux store provider
│   │   └── index.ts                            # Barrel export
│   │
│   ├── services/                               # External services
│   │   ├── api/                                # API services
│   │   │   └── index.ts                        # API service exports
│   │   └── storage/                            # Storage services
│   │       ├── secure-storage.service.ts       # Secure storage implementation
│   │       └── index.ts                        # Barrel export
│   │
│   ├── store/                                  # Redux store (core wiring)
│   │   ├── hooks.ts                            # Typed Redux hooks
│   │   ├── index.ts                            # Store configuration
│   │   ├── persistor.ts                        # Redux Persist setup
│   │   └── rootReducer.ts                      # Root reducer (imports feature reducers)
│   │
│
│   ├── features/                               # Domain-driven feature modules
│   │   └── counter/                            # Example counter feature
│   │       ├── components/                     # Feature UI components
│   │       │   └── Counter.tsx
│   │       ├── hooks/                          # Feature hooks
│   │       │   └── useCounter.ts
│   │       ├── services/                       # API or external services
│   │       │   └── counter.api.ts
│   │       ├── store/                          # Feature-local redux artifacts
│   │       │   ├── counter.slice.ts
│   │       │   ├── persist.ts
│   │       │   └── counter.selectors.ts
│   │       └── types/                          # Feature types
│   │           └── counter.types.ts
│   ├── styles/                                 # Global styles
│   │   └── globals.css                         # Tailwind directives & global CSS
│   │
│   ├── types/                                  # Global type definitions
│   │   ├── common/                             # Common types
│   │   │   ├── api.types.ts                    # API-related types
│   │   │   ├── auth.types.ts                   # Authentication types
│   │   │   ├── http.types.ts                   # HTTP client types
│   │   │   └── index.ts                        # Barrel export
│   │   ├── utility/                            # Utility types
│   │   │   ├── either.ts                       # Either type
│   │   │   ├── result.ts                       # Result type
│   │   │   └── index.ts                        # Barrel export
│   │   ├── i18n.ts                             # i18n type definitions
│   │   └── index.ts                            # Barrel export
│   │
│   └── proxy.ts                                # API proxy configuration
│
├── .czrc                                       # Commitizen configuration
├── .dockerignore                               # Docker ignore rules
├── .editorconfig                               # Editor configuration
├── .env.example                                # Environment variables template
├── .lintstagedrc.mjs                           # Lint-staged configuration
├── .npmrc                                      # NPM configuration
├── .nvmrc                                      # Node version specification
├── .prettierignore                             # Prettier ignore rules
├── .prettierrc                                 # Prettier configuration
├── .yarnrc.yml                                 # Yarn configuration
├── CHANGELOG.md                                # Project changelog
├── CODE_OF_CONDUCT.md                          # Code of conduct
├── CONTRIBUTING.md                             # Contributing guidelines
├── commitlint.config.mjs                       # Commitlint configuration
├── docker-compose.yml                          # Docker Compose configuration
├── Dockerfile                                  # Docker image definition
├── eslint.config.mjs                           # ESLint configuration (Flat Config)
├── LICENSE                                     # MIT License
├── next.config.ts                              # Next.js configuration
├── next-env.d.ts                               # Next.js TypeScript declarations
├── package.json                                # Project dependencies & scripts
├── postcss.config.mjs                          # PostCSS configuration
├── README.md                                   # Project documentation
├── SECURITY.md                                 # Security policy
├── tsconfig.json                               # TypeScript configuration
└── yarn.lock                                   # Yarn lock file
```

## 📚 Documentation

We have detailed documentation for specific parts of the application:

- **[Feature-Based Architecture](src/features/README.md)**: Learn about our domain-driven design approach and how to create new features.
- **[Internationalization (i18n)](src/i18n/README.md)**: Guide on how to use translations, add new locales, and handle routing.
- **[HTTP Client](src/lib/utils/http/README.md)**: Comprehensive guide on using our custom `fetchClient` and `axiosClient` for API requests.

## 🏗️ Architecture

This project follows a **Feature-Based Architecture**. Instead of grouping files by type (components, hooks, services), we group them by **feature** (auth, users, projects).

- **`src/features/`**: Contains all domain logic. Each feature is self-contained.
- **`src/app/`**: The Next.js App Router layer. It should be thin and primarily compose features.
- **`src/components/common/`**: Reusable UI components that are not specific to any feature (e.g., Button, Input).

For more details, read the [Feature Architecture Guide](src/features/README.md).

## ⚙️ Configuration

### Environment Variables

The project uses environment variables for configuration. Copy `.env.example` to `.env` to get started.

```bash
cp .env.example .env
```

| Variable              | Description                  | Default          |
| :-------------------- | :--------------------------- | :--------------- |
| `NEXT_PUBLIC_API_URL` | Base URL for the API         | `(empty)`        |
| `PORT`                | Port to run the server on    | `3000`           |
| `CONTAINER_NAME`      | Name of the Docker container | `next-app`       |
| `IMAGE_NAME`          | Name of the Docker image     | `nextjs-starter` |
| `IMAGE_TAG`           | Tag for the Docker image     | `latest`         |

### Internationalization

Supported locales are defined in `src/lib/config/app-locales.ts`. To add a new language, follow the steps in the [i18n Guide](src/i18n/README.md).

### HTTP Client

The HTTP client is pre-configured to handle authentication tokens automatically. See `src/lib/utils/http/README.md` for advanced usage.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find this project useful, please give it a ⭐️ on GitHub!
