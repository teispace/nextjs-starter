# Deployment

## Environment variables

Variables are declared once in `src/lib/env/index.ts`, in three groups, and
validated at startup. A missing or malformed required variable fails the
build with the variable name and its description rather than surfacing as
`undefined` at runtime.

| Variable | Group | Required | Notes |
| :-- | :-- | :-- | :-- |
| `NEXT_PUBLIC_APP_URL` | client | **In production** | The public origin. Canonical URLs, social images, and HSTS all derive from it. |
| `NEXT_PUBLIC_API_URL` | client | No | Your API's origin. Empty means same-origin or proxied requests. |
| `API_INTERNAL_URL` | server | No | The address the server uses to reach the API when it differs from the public one: a service name inside a cluster. |
| `BUILD_STANDALONE` | server | No | Emits the self-contained server. The Dockerfile sets it; platform hosts do not need it. |
| `CSP_MODE` | server | No | `static`, `nonce`, or `off`. See [security](security.md). |
| `DEFAULT_TIMEZONE`, `DEFAULT_LOCALE` | server | No | Keep server-rendered dates and numbers deterministic. |
| `NODE_ENV` | shared | No | Set by the tooling. Read it through the typed env, never `process.env`. |

Client variables must start with `NEXT_PUBLIC_` and be listed in
`runtimeEnv`. They are inlined into the browser bundle **at build time**,
which has two consequences worth internalising: a public variable is not a
secret, and changing one requires a rebuild, not a restart.

Reading a server variable from a `'use client'` module throws by design.

### Adding one

```bash
pnpm exec next-maker env SENTRY_DSN --type url --describe "Sentry endpoint"
```

That adds it to the schema, `.env.example`, and your `.env`. By hand: add it
to the right group in `src/lib/env/index.ts`, add it to `runtimeEnv` if it is
public, then run `pnpm env:sync` to regenerate the example file. The
pre-commit hook checks the two stay in step.

## Standalone and Docker

`BUILD_STANDALONE=true pnpm build` emits `.next/standalone`, a server with
only the dependencies it actually needs. The multi-stage `Dockerfile` uses
it and runs as a non-root user.

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.example.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  -t app .
```

The build arguments are not optional. Public variables are inlined during
`next build`, which happens inside the image, so a value supplied only at
`docker run` arrives too late and the bundle keeps whatever was there at
build time. `.env` is in `.dockerignore` on purpose: an image should not
carry a developer's local file.

`docker-compose.yml` passes the same values through from your environment and
is the quickest way to check the image end to end.

In a workspace, each app has its own Dockerfile built from the repository
root with `turbo prune`, so an image contains one app and the workspace
packages it uses:

```bash
docker build -f apps/web/Dockerfile -t web .
```

## Platform hosts

On Vercel, Netlify, or similar: leave `BUILD_STANDALONE` unset, set the
environment variables in the project settings, and let the platform run
`pnpm build`. Everything else, including the proxy and the caching, is
standard framework behaviour.

Behind your own reverse proxy, forward the real host and protocol headers so
redirects and canonical URLs stay correct, and terminate TLS in front. HSTS
is sent only when the public URL is https, which is what you want the moment
a certificate exists.

## Caching in production

Public reads are cached by tag and lifetime, and invalidated with
`revalidateTag` from the action that changed the data. Two things to confirm
on a real deployment:

- **Your CDN respects the framework's cache headers.** Overriding them with a
  blanket rule turns a well-cached page into either a stale one or an
  uncached one.
- **Every mutation revalidates what it changed.** A stale page after a write
  is nearly always a missing tag rather than a caching bug.

## Release checklist

1. `pnpm validate` passes: lint, types, deprecations, tests, and a production
   build.
2. `pnpm test:e2e` passes against that build.
3. Environment variables are set for the target, with `NEXT_PUBLIC_APP_URL`
   as the real public origin.
4. `CSP_MODE` is chosen deliberately, and every third-party origin is in the
   policy.
5. Logs reach your pipeline as JSON, and a deliberate error shows up where
   you expect with its digest.
6. Rate limiting exists somewhere in front of the API.
7. The health of the first deploy is checked on a real device: the social
   card renders, sign-in round-trips, and a mutation invalidates what it
   should.

## Upgrading later

The application was generated from a pinned starter tag, so upgrades are a
merge rather than a rewrite:

```bash
npx @teispace/next-maker upgrade
```

It composes the old and new starter with your answers, three-way merges your
project against them, and reports every file it changed. Read the report,
resolve anything it marks, then run `pnpm validate`.
