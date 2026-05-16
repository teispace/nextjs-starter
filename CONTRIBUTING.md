# Contributing to Teispace

Thank you for your interest in contributing to Teispace! This guide will help you get started with the development workflow and standards.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v24 LTS or higher
- **Yarn**: v4.0.0 or higher
- **Git**: Latest stable version
- **VSCode**: (Recommended) with the following extensions:
  - Biome (`biomejs.biome`) — single extension for lint + format + import sort
  - EditorConfig for VS Code

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/teispace.git
cd teispace

# Add upstream remote
git remote add upstream https://github.com/teispace/teispace.git
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Create a Feature Branch

```bash
# Sync your local main with upstream
git checkout main
git pull upstream main

# Create a new branch off main
git checkout -b feat/your-feature-name
```

## 🌳 Branching Strategy

Trunk-based: `main` is the only long-lived branch. Short-lived feature/fix branches are cut from `main` and merged back via PR.

- **`main`** – production-ready trunk; all PRs target this
- **`feat/*`** – new features
- **`fix/*`** – bug fixes
- **`docs/*`** – documentation-only updates
- **`chore/*`** – maintenance / dependency work
- **`refactor/*`** – non-functional restructuring

CI runs on every push and PR to `main`.

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent and meaningful commit messages.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools
- **ci**: Changes to CI configuration files and scripts

### Using Commitizen

We **highly recommend** using Commitizen for guided commits:

```bash
# Stage your changes
git add .

# Use Commitizen to create a commit
yarn commit
```

This will prompt you through creating a properly formatted commit message.

### Examples

```bash
feat(auth): add user authentication flow
fix(ui): resolve button alignment issue on mobile
docs(readme): update installation instructions
chore(deps): upgrade react to v19
```

## 🔍 Code Quality Standards

### Automated Checks

On every commit, the following checks run automatically via Husky hooks:

#### Pre-commit Hook

- Verifies `.env.example` is in sync with `.env` (`yarn env:sync --check`)
- Runs `lint-staged`, which executes `biome check --write` on staged files (single command lints, formats, sorts imports)
- If any TypeScript files are staged, runs `yarn type-check` (`tsc --noEmit`) on the whole project

#### Pre-push Hook

- `yarn ci:check` (the same `biome ci` CI runs)
- `yarn type-check`
- `yarn check:deprecated`
- `yarn test` (Vitest run)

The production build is left to CI — pre-push deliberately skips it to keep the wait short.

#### Commit-msg Hook

- **Commitlint**: validates commit message format
- Ensures commits follow Conventional Commits specification

### Manual Checks

Before submitting a PR, run these commands locally:

```bash
# Lint + format + import-sort check (non-mutating, matches CI)
yarn lint

# Apply all auto-fixes (lint + format + import sort)
yarn lint:fix

# Format only (write)
yarn format

# Check formatting only (non-mutating)
yarn format:check

# CI-equivalent single-pass check (what GitHub Actions runs)
yarn ci:check

# Type check
yarn type-check

# Flag any use of an @deprecated API (TS compiler-API sweep)
yarn check:deprecated

# Run tests
yarn test

# Run all checks + build
yarn validate
```

## 🧪 Testing

Vitest + React Testing Library + jsdom are wired up. Co-locate tests as `*.test.ts(x)` next to the source file. Use `renderWithProviders` from `test/test-utils.tsx` when your component needs Redux/i18n.

```bash
yarn test            # one-shot run (also what CI executes)
yarn test:watch      # watch mode for local dev
yarn test:coverage   # v8 coverage report
```

Global setup (jsdom polyfills, `react-secure-storage` and `server-only` stubs) lives in `test/setup.ts`.

## 🔧 Development Workflow

### Step-by-Step Guide

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/amazing-feature
   ```

2. **Make your changes** following the code style

3. **Stage your files**:

   ```bash
   git add .
   ```

4. **Commit using Commitizen**:

   ```bash
   yarn commit
   ```

   - The pre-commit hook will automatically lint and format your staged files
   - If there are errors, fix them and try again

5. **Push to your fork**:

   ```bash
   git push origin feat/amazing-feature
   ```

6. **Create a Pull Request** on GitHub

### What Happens During Commit?

When you run `git commit` or `yarn commit`:

1. **Pre-commit hook triggers**:
   - Syncs `.env.example` from `.env` (via `yarn env:sync`)
   - Runs `lint-staged` on your staged files
   - Executes `biome check --write` (lint + format + import sort in one pass)
   - Type-checks staged TypeScript files
   - If any errors occur, commit is blocked

2. **Commit-msg hook triggers**:
   - Validates your commit message format
   - Ensures it follows Conventional Commits
   - Blocks commit if format is invalid

3. **Commit succeeds** if all checks pass

## 🎯 Pull Request Guidelines

### Before Submitting

- [ ] All commits follow Conventional Commits format
- [ ] `yarn ci:check` passes (lint + format + import sort)
- [ ] `yarn type-check` passes
- [ ] `yarn check:deprecated` passes
- [ ] `yarn test` passes (add tests for new behaviour)
- [ ] No `console.*` or debugging code left behind (use `logger` from `@/lib/logger`)
- [ ] Self-review of your own diff

### PR Title Format

Use the same format as commit messages:

```
feat(component): add dark mode support
fix(api): handle null response correctly
```

### PR Description Template

```markdown
## Description

Brief description of what this PR does

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made

- List key changes here

## Testing

How to test these changes

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] My changes generate no new warnings
- [ ] I have added tests (if applicable)
```

## 🐛 Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating issues.

Include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Screenshots if applicable

## 💡 Feature Requests

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).

Include:

- Clear description of the feature
- Use cases
- Proposed solution (if you have one)
- Alternatives considered

## 📚 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## ❓ Questions?

If you have questions or need help:

1. Check existing [GitHub Issues](../../issues)
2. Create a new issue with the "question" label
3. Reach out to maintainers

## 🙏 Thank You!

Your contributions make this project better. We appreciate your time and effort!

---

**Happy Coding! 🚀**
