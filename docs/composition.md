# Composition manifest

`next-maker.json` describes how this starter turns into a generated project. `@teispace/next-maker` reads it after cloning the pinned starter tag, applies the user's answers, and never carries its own list of starter files. When you add or move an optional feature, update the manifest in the same commit; `test/next-maker-manifest.test.ts` fails when the manifest and the tree disagree.

## Vocabulary

- **Option**: a question the CLI asks (`state`, `http`, `i18n`, `tests`, ...). Choices, booleans, or multi-selects, each with a default and optional `requires` constraints.
- **Feature**: a unit of the tree that is present when its `when` condition holds. `when` maps an option to the values that turn the feature on.
- **Variant**: what to do when the feature is `on` or `off`:
  - `remove`: globs deleted (relative to the project root).
  - `overlay`: a directory under `.next-maker/overlays/` whose files are copied over the tree.
  - `anchors`: anchor ids stripped from every file.
  - `unwrapJsx`: `<Tag ...>` and `</Tag>` removed in a file, keeping the children.
  - `unwrapCall`: `name(x)` replaced by `x` in a file.
  - `packages` / `devPackages` / `scripts` / `env` / `packageJsonKeys`: entries removed from `package.json` and `.env.example`.
- **always.remove**: starter-only files that never ship.
- **packageManagers**: per-manager `packageManager` field, lockfile, overlay, and files to drop.

Order of operations in the CLI: package-manager overlay, removals, feature overlays, anchors and unwraps, `package.json` and env edits, package-manager command rewrites, then a formatting pass. Files an overlay adds are subject to the removals of every other feature (an overlay's tests still leave when tests are off), except removals owned by a sibling of the overlay's own option: the `zustand` overlay replaces what the `redux` removal deleted and must survive it.

## Anchors

Anchors are comments that the CLI strips when the named feature is off:

```ts
// @next-maker:ws
import { wsSlice } from './slices/ws.slice';   // this line goes with the anchor

/* @next-maker:i18n:start */
locale: SupportedLocale;
messages: AbstractIntlMessages;
/* @next-maker:i18n:end */                     // the whole block goes

export * from './app-locales'; // @next-maker:i18n   (trailing: only this line goes)
```

Rules:

- An anchor on its own line removes itself and the next line.
- A trailing anchor removes its own line.
- `:start` / `:end` pairs remove everything between them, inclusive.
- Use `{/* ... */}` inside JSX, `#` in YAML, shell, and `.env.example`, `/* */` in CSS.
- A wrapper element (`<StoreProvider>`) cannot be anchored; list it under `unwrapJsx` instead.
- Biome keeps a comment attached to the statement below it, so anchors survive formatting and import sorting. Keep one anchor per line and never rely on an anchor spanning a formatter-reflowed construct.

## Overlays

An overlay is a real file tree, type-checked by the composition matrix in the CLI's test suite rather than by this repository's `tsc` (they are excluded in `tsconfig.json` because they replace base files). An overlay file must carry the anchors of every other feature that touches that file: `test/test-utils.tsx` in the `zustand` overlay still contains the `i18n` anchors, because a project can be Zustand without i18n.

Current overlays:

| Overlay      | Applies when            | Replaces                                                                 |
| :----------- | :---------------------- | :----------------------------------------------------------------------- |
| `no-i18n`    | `i18n: false`           | root `app/` shell and pages, proxy, SEO config, English components       |
| `zustand`    | `state: zustand`        | store, hooks, `StoreProvider`, counter store and hook, test utils        |
| `http-axios` | `http: axios`           | universal client on the Axios adapter                                    |
| `bff`        | `bff: true`             | browser base URL pointing at the `/api/backend` proxy route              |
| `pm-npm`, `pm-yarn`, `pm-bun` | package manager | Dockerfile and CI workflow (plus `.yarnrc.yml` for Yarn)      |

## Adding an optional feature

1. Put the feature's own files in their own directory where possible, so `remove` is one glob.
2. Where the feature touches a shared file, add anchors around its lines, or a `unwrapJsx` / `unwrapCall` entry for wrappers.
3. If the "off" state needs different code rather than less code, add an overlay.
4. Declare the feature in `next-maker.json` with its packages, scripts, and env keys.
5. Run `pnpm test` (the manifest test) and the CLI's composition matrix.
