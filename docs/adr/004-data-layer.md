# 004. Server-first data layer with TanStack Query and Redux

**Status**: accepted (v2)

**Decision**: Server Components read through a feature DAL (`api/server.ts`); mutations are Server Actions built with next-safe-action (`api/actions.ts`); reads the client must own go through TanStack Query with server prefetch and hydration (`api/queries.ts`); client-only state is Redux Toolkit with listener-middleware persistence. Contracts are zod schemas (`api/schema.ts`).

**Alternatives**: everything in Redux (RTK Query) as in 1.x; Zustand or Jotai for client state; SWR; no client cache at all.

**Why**: Server Components and Cache Components make the server the primary read path, which removes most client fetching. What remains (live lists, pagination, optimistic UI) is exactly what TanStack Query models well, and its hydration API fits the App Router streaming model. RTK Query duplicates that with weaker Suspense support. Redux stays for client-only state because large applications benefit from a single, inspectable, serialisable store with middleware; Zustand is offered by next-maker for teams that prefer less structure. next-safe-action adds input validation, typed errors, and middleware to Server Actions without hiding the platform.
