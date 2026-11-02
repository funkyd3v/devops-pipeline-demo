# Progress

Agents: read this at the start of each session and update it at the end of each stage.

## Current stage

Stage 3: Jenkins pipeline (build, test, push image) - not started.

## Completed

- Repo created, README with roadmap, AGENTS.md added
- Stage 1: NestJS REST API
  - `GET /health` returns `{ status: 'ok' }`
  - `GET /items` and `POST /items`, with `CreateItemDto` validation
    (global `ValidationPipe`, `whitelist: true` in `src/app.config.ts`)
  - In-memory `ItemsService`; data is lost on restart
  - PORT read from env, default 3000
  - Unit tests: 2 suites / 4 tests passing (`npm test`)
  - E2E tests: 1 suite / 3 tests passing (`npm run test:e2e`)
- Stage 2: Dockerfile (multi-stage) and docker-compose
  - `app/Dockerfile`: `deps` -> `build` -> `prod-deps` -> `runtime`
  - Base image pinned to `node:26.13.0-alpine` in every stage
  - Runtime stage copies only `dist/`, production `node_modules/`, `package*.json`
  - Runs as non-root `node` user (uid 1000); `NODE_ENV=production`, `PORT=3000`
  - `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3`
    calls `GET /health` with busybox `wget`
  - `app/.dockerignore` keeps `node_modules/`, `dist/`, `.git`, `.env` out of the context
  - `docker/docker-compose.yml`: one `api` service, image
    `funkyd3v/devops-pipeline-demo:0.1.0`, `3000:3000`, `restart: unless-stopped`
  - Verified: image 68.9 MB content size, container runs as `node`, compose service
    healthy in ~3s, `/health` 200, `POST /items` 201, `GET /items` 200,
    empty name 400, `compose down` clean
  - Fixed during build: build stage was missing `package.json`, so
    `npm run build` had no script

## Next

- Stage 3: Jenkins pipeline
  - Run Jenkins in a container on WSL2 with Docker access
  - Jenkinsfile: checkout -> install -> test -> build image -> push to Docker Hub
  - Docker Hub credentials from the Jenkins credentials store, never committed
  - Reuse the same pinned Node 26 tag so CI and local builds match

## Known issues

- None open. `dist/` and `node_modules/` are gitignored.
- Image tag `0.1.0` is set by hand; Stage 3 will switch to build-number tags.
