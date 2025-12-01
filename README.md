# Next.js Starter Template.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

A production-ready, feature-packed starter template for Next.js applications. Built with modern web development best practices and tools to jumpstart your next project.

## 📂 Project Structure (short)

```
nextjs-starter/
├─ public/                      # Static assets (images, favicon)
├─ src/                         # Application source
│  ├─ app/                      # Next.js App Router (per-locale routes)
│  ├─ components/               # Shared UI components and barrels
│  ├─ features/                 # Feature-driven modules (auth, counter, etc.)
│  ├─ i18n/                     # Internationalization (translations + routing)
│  ├─ lib/                      # Configs, utils, http clients, validations
│  ├─ providers/                # React providers (theme, store, root)
│  ├─ services/                 # API & storage services
│  ├─ store/                    # Redux store, persistor, typed hooks
│  ├─ styles/                   # Global CSS / Tailwind
│  └─ types/                    # Global TypeScript types
├─ .github/, .husky/, .vscode/   # CI, git hooks, editor configs
├─ Dockerfile, docker-compose.yml
├─ package.json, tsconfig.json, next.config.ts
└─ README.md, LICENSE, CHANGELOG.md
```

For developer-focused detail see `src/features/README.md` and `src/i18n/README.md`.

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
