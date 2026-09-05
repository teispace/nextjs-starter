# 005. Cache Components on by default

**Status**: accepted (v2)

**Decision**: `cacheComponents` and `partialPrefetching` are enabled. Pages are static shells with dynamic holes under `<Suspense>`. Public reads use `use cache` with tags; request-dependent work is isolated in small async components.

**Alternatives**: the classic static/dynamic route split (`dynamic = 'force-dynamic'`, `revalidate`), or opting out of caching entirely.

**Why**: the model makes the boundary between cached and per-request work explicit and enforced by the build: an unstable value in the shell fails the build instead of silently making a page dynamic. It produces faster navigations (the shell is prefetched) and cheaper servers (the shell is served from the cache) without per-page configuration. The cost is discipline: request APIs must sit under Suspense and the DAL must separate public from user data, which is what the feature layout enforces.
