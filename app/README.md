# devops-pipeline-demo API

Minimal NestJS REST API used by the DevOps pipeline in this repo. Items are
stored in memory, so data is lost on restart.

## Endpoints

| Method | Path      | Body                 | Response                                  |
| ------ | --------- | -------------------- | ----------------------------------------- |
| GET    | `/health` | –                    | `200` `{ "status": "ok" }`                |
| GET    | `/items`  | –                    | `200` array of items                      |
| POST   | `/items`  | `{ "name": "..." }`  | `201` created item `{ "id": 1, "name": "..." }` |

`POST /items` validates the body with `class-validator`; a missing or empty
`name` returns `400 Bad Request`.

## Requirements

- Node.js 26.x
- npm

## Run locally

```bash
cd app
npm ci                # reproducible install (package-lock.json is committed)
npm run start:dev     # watch mode on http://localhost:3000
```

The port is read from the `PORT` environment variable and defaults to `3000`:

```bash
PORT=8080 npm run start:dev
```

## Tests

```bash
npm test          # unit tests (Jest)
npm run test:e2e  # end-to-end tests (Jest + supertest)
```

## Build and run the compiled output

```bash
npm run build
npm run start:prod   # runs node dist/main
```

## Example requests

```bash
curl localhost:3000/health
curl -X POST localhost:3000/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"widget"}'
curl localhost:3000/items
```
