# UI libraries

The starter ships no UI primitives on purpose: a design system is a product decision, and every option below installs in minutes. Tailwind v4 and `@teispace/next-themes` (class-based dark mode via the `dark:` variant, `color-scheme` aware) are already configured, so any library that works with Tailwind or with a `class="dark"` toggle works here.

Whatever you choose, keep primitives in `src/components/ui/` and feature-specific composition in `src/features/<name>/components/`.

## shadcn/ui (recommended for Tailwind projects)

Copies components into your tree; you own the code.

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button dialog form
```

- `components.json` is created by `init`; point `aliases.components` at `@/components` and `aliases.utils` at `@/lib/utils/cn` (create `cn` with `clsx` + `tailwind-merge`, both added by the CLI).
- Tailwind v4 needs no config file; the CLI writes the theme tokens into `src/styles/globals.css`. Keep the `@teispace/next-themes` import at the top of that file.
- Forms: shadcn's `Form` wraps react-hook-form. Pair it with `zodResolver` and the same zod schema you use in `api/schema.ts`, and submit through a Server Action with `useAction`.

## Radix Primitives

Headless, accessible primitives without styling. Useful when you want full control of markup.

```bash
pnpm add radix-ui
```

Import from the umbrella package (`import { Dialog } from 'radix-ui'`) and style with Tailwind classes. shadcn/ui is Radix plus styling; start with shadcn unless you need something it does not cover.

## Material UI

```bash
pnpm add @mui/material @emotion/react @emotion/styled @mui/material-nextjs
```

- Wrap the app in `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter` inside `RootProvider` so Emotion styles stream correctly with Server Components.
- Use MUI's `CssVarsProvider` with `colorSchemeSelector: 'class'` so the theme follows the `dark` class that `@teispace/next-themes` sets.
- MUI components are Client Components. Keep pages as Server Components and mount MUI inside client leaves.
- With `CSP_MODE=nonce`, pass the nonce to the cache provider (`options={{ nonce }}`); the layout already reads it via `getNonce()`.

## Mantine

```bash
pnpm add @mantine/core @mantine/hooks
pnpm add -D postcss-preset-mantine postcss-simple-vars
```

- Add `MantineProvider` to `RootProvider` and `ColorSchemeScript` to the `<head>` in `src/app/[locale]/layout.tsx`, next to the theme script.
- Mantine uses its own colour-scheme attribute; set `defaultColorScheme="auto"` and let it manage `data-mantine-color-scheme`, or bridge it to the `dark` class with a small effect.

## HeroUI (formerly NextUI)

```bash
pnpm add @heroui/react framer-motion
```

Add the `HeroUIProvider` to `RootProvider` and the `@plugin '@heroui/theme'` line to `globals.css`. HeroUI reads the `dark` class, so theming works out of the box.

## Icons

`lucide-react` (used by shadcn) or `@tabler/icons-react`. Both tree-shake per icon.

## Conventions regardless of library

- Server Components by default; add `'use client'` at the leaf that needs interactivity.
- Read theme state through CSS (`dark:` variant), not through React, so components render identically on the server.
- Keep component tests in `*.test.tsx` next to the component and render them with `renderWithProviders`.
- With `CSP_MODE=nonce`, any library that injects inline `<style>` needs the nonce; with the default `static` mode, `style-src` allows inline styles.
