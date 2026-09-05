# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base

FROM base AS builder

WORKDIR /app

# Public env vars are inlined into the client bundle at build time, so they
# must be present here, not only at runtime. Compose passes them as build args.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* .yarnrc.yml* ./

# Corepack reads the `packageManager` pin from package.json, so no explicit
# `prepare` step is needed. The `.yarn` directory is not copied: with the
# node-modules linker it holds only a local install cache.
RUN \
  if [ -f yarn.lock ]; then corepack enable && yarn install --immutable; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  else echo "Warning: Lockfile not found. It is recommended to commit lockfiles to version control." && yarn install; \
  fi

COPY src ./src
COPY public ./public
COPY next.config.ts .
COPY tsconfig.json .
COPY postcss.config.mjs .

ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm build; \
  else npm run build; \
  fi


FROM base AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
# The standalone server binds to localhost unless told otherwise, which makes
# the container unreachable from outside.
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
