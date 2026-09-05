# 006. Biome for lint and format

**Status**: accepted (1.x, kept in v2)

**Decision**: Biome is the only linter and formatter. One config (`biome.json`), one command in CI (`biome ci`), one editor extension.

**Alternatives**: ESLint + Prettier + `prettier-plugin-tailwindcss`.

**Why**: one tool replaces three, runs in milliseconds over the repository, and needs no plugin coordination. Its rules cover the React, accessibility, security, and correctness checks the project relies on, and it sorts imports. The `check:deprecated` script covers the one thing Biome does not do: flagging `@deprecated` API usage through the TypeScript checker.
