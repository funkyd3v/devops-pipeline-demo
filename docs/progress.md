# Progress

Agents: read this at the start of each session and update it at the end of each stage.

## Current stage

Stage 2: Dockerfile (multi-stage) and docker-compose — not started.

## Completed

- Repo created, README with roadmap, AGENTS.md added
- Stage 1: NestJS REST API
  - `GET /health` returns `{ status: 'ok' }`
  - `GET /items` and `POST /items`, with `CreateItemDto` validation
    (global `ValidationPipe`, `whitelist: true`)
  - In-memory `ItemsService`; data is lost on restart (persistence is out of scope)
  - PORT read from env, default 3000
  - Unit tests: 2 suites / 4 tests passing (`npm test`)
  - E2E tests: 1 suite / 3 tests passing (`npm run test:e2e`)

## Next

- Stage 2: Docker
  - Multi-stage Dockerfile (small base image, non-root user, HEALTHCHECK on `/health`)
  - docker-compose for local runs

## Known issues

- None open. `dist/` and `node_modules/` are gitignored.
