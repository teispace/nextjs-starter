# 001. pnpm as the package manager

**Status**: accepted (v2)

**Decision**: pnpm 11 is the default. `pnpm-workspace.yaml` carries `minimumReleaseAge` (packages must be a day old before install) and an explicit `allowBuilds` map so no postinstall script runs unless listed. next-maker can emit npm, Yarn, or Bun variants for projects that need them.

**Alternatives**: Yarn 4 (1.x), npm, Bun.

**Why**: strict node_modules by default (no phantom dependencies), the fastest cold installs among the Node managers, first-class workspaces and catalogs for the monorepo mode, and supply-chain controls (`minimumReleaseAge`, build allow-list) that the others do not offer natively. Bun remains an option for teams already on it.
