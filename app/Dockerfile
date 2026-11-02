# syntax=docker/dockerfile:1

# The exact same pinned tag is used in every stage: builds are reproducible and
# a new Node patch release cannot silently change behaviour between local runs
# and Jenkins. "latest" is never used for that reason.
FROM node:26.13.0-alpine AS deps
WORKDIR /app
# Manifests are copied before the source so this layer - and the expensive
# npm ci layer below - stays cached when only application code changes.
COPY package.json package-lock.json ./
# npm ci installs exactly the versions in package-lock.json and fails if the
# lockfile and package.json disagree, so every environment resolves identically.
RUN npm ci

FROM node:26.13.0-alpine AS build
WORKDIR /app
# Reuse the already-installed modules instead of running a second install.
COPY --from=deps /app/node_modules ./node_modules
# Only build inputs are copied; tests and docs are not needed to compile.
# package.json supplies the "build" script that npm run build executes.
COPY package.json package-lock.json ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:26.13.0-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# Nest CLI, TypeScript and Jest are build-time tools. Installing without dev
# dependencies here keeps them out of the final image without a second install
# in the runtime stage.
RUN npm ci --omit=dev

FROM node:26.13.0-alpine AS runtime
WORKDIR /app
# NODE_ENV=production makes Nest and npm skip development-only paths; PORT is
# the same contract src/main.ts already reads (3000 by default).
ENV NODE_ENV=production \
    PORT=3000
# Only compiled output, production dependencies and manifests are copied, so no
# source, tests or build tooling ships to production.
COPY package.json package-lock.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# The official Node images ship an unprivileged "node" user (uid 1000). Running
# as root would add needless blast radius if the app were compromised.
USER node
EXPOSE 3000
# Docker marks the container unhealthy when GET /health stops answering; this is
# also the endpoint Kubernetes probes will target in a later stage.
# --interval=30s      probe every 30s: fast enough to catch a crash, light
#                     enough for a single instance.
# --timeout=3s        a healthy local response takes milliseconds, so 3s means
#                     "hung", not "slow".
# --start-period=10s  grace window for Nest to boot; early failures during
#                     startup are not counted.
# --retries=3         three consecutive failures (~90s) before the container is
#                     marked unhealthy, so one transient hiccup is ignored.
#                     (Plain Docker only reports status; it does not restart.)
# busybox wget is already in Alpine, so the probe adds no packages.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main.js"]
