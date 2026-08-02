# nestjs-ai-starter

Production-grade NestJS microservice starter — Postgres, Redis, JWT auth, OpenAPI, CI/CD — with a built-in **pgvector semantic search** module for RAG-ready retrieval.

## Why this exists

Most "NestJS starter" repos stop at auth + a database connection. This one also ships the retrieval infrastructure a real AI feature needs: a pluggable embeddings service, a Redis-backed cache to avoid re-embedding duplicate content, and a Postgres/pgvector-backed similarity search — the same pipeline that sits underneath a RAG chatbot or semantic search feature.

## Stack

- **NestJS 10** / TypeScript
- **PostgreSQL** via TypeORM (migrations, not synchronize)
- **Redis** (ioredis) — embedding cache today, general-purpose client for anything else that needs one
- **JWT** auth (access + refresh, rotation on refresh) — every route requires a token by default, opt out per-route with `@Public()`
- **OpenAPI** via `@nestjs/swagger`, served at `/docs`
- **pgvector** for embedding storage + cosine similarity search
- Docker (multi-stage build) + `docker-compose` + GitHub Actions CI (lint/build/test on Node 20.x/22.x, Docker build check)

## What's here

- [x] Typed env validation, health liveness/readiness checks (Postgres + Redis)
- [x] Postgres via TypeORM, Redis client, JWT auth with refresh-token rotation
- [x] pgvector semantic search module — pluggable embeddings provider, Redis-backed embedding cache, ingest/search API
- [x] Multi-stage Dockerfile, `docker-compose.yml`, GitHub Actions CI
- [x] Unit test coverage for auth, health, and the search pipeline

See [docs/architecture.md](docs/architecture.md) for the reasoning behind the pgvector/caching/raw-SQL decisions, and a couple of real gotchas hit while building this.

## Getting started

### Fastest: Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

This builds the app image, starts Postgres (with the `vector` extension) and Redis, runs migrations once via a one-shot `migrate` service, then starts the app. Postgres/Redis are published on `5433`/`6380` on the host (not the defaults) so this doesn't clash with any Postgres/Redis you already have running locally — the app itself still talks to them on the standard ports over the internal Docker network.

The app is then up at `http://localhost:3000`, docs at `http://localhost:3000/docs`.

### Manual (for local iteration)

```bash
cp .env.example .env   # fill in real values; JWT secrets can be any random string for dev
npm install
```

Postgres (with pgvector) and Redis running locally — ad-hoc containers work fine:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nestjs_ai_starter -p 5432:5432 pgvector/pgvector:pg16
docker run -d --name redis -p 6379:6379 redis:7
```

Then:

```bash
npm run migration:run
npm run start:dev
```

## API surface

Everything except `/auth/register`, `/auth/login`, `/auth/refresh`, and `/health/*` requires a Bearer access token. Full request/response shapes are in Swagger at `/docs` — this is just the map:

| Method | Path                 | Auth          | Purpose                                          |
| ------ | -------------------- | ------------- | ------------------------------------------------- |
| POST   | `/auth/register`     | Public        | Create a user, get a token pair                   |
| POST   | `/auth/login`        | Public        | Get a token pair                                  |
| POST   | `/auth/refresh`      | Refresh token | Rotate the token pair                             |
| POST   | `/auth/logout`       | Bearer        | Revoke the stored refresh token                   |
| GET    | `/health/live`       | Public        | Liveness — is the process up                      |
| GET    | `/health/ready`      | Public        | Readiness — Postgres + Redis reachable            |
| POST   | `/search/documents`  | Bearer        | Embed and store a document                        |
| GET    | `/search?q=&limit=`  | Bearer        | Embed the query, return top-k by cosine distance  |

The embeddings provider defaults to a deterministic local stub (`EMBEDDINGS_PROVIDER=local`, no API key needed) — see [docs/architecture.md](docs/architecture.md) for why, and how to swap in a real provider.

## Testing & CI

```bash
npm test
```

Every PR runs lint, build, and tests on a Node 20.x/22.x matrix, plus a Docker build check, via GitHub Actions.

## License

MIT
