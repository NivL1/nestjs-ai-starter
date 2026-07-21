# nestjs-ai-starter

Production-grade NestJS microservice starter — Postgres, Redis, JWT auth, OpenAPI, CI/CD — with a built-in **pgvector semantic search** module for RAG-ready retrieval.

> Status: under active development. See the roadmap below for what's landed.

## Why this exists

Most "NestJS starter" repos stop at auth + a database connection. This one also ships the retrieval infrastructure a real AI feature needs: a pluggable embeddings service, a Redis-backed cache to avoid re-embedding duplicate content, and a Postgres/pgvector-backed similarity search — the same pipeline that sits underneath a RAG chatbot or semantic search feature.

## Stack

- **NestJS 10** / TypeScript
- **PostgreSQL** via TypeORM (migrations, not synchronize)
- **Redis** (ioredis) — sessions/cache today, embedding cache in the search module
- **JWT** auth (access + refresh, rotation on refresh)
- **OpenAPI** via `@nestjs/swagger`
- **pgvector** for embedding storage + cosine similarity search
- Docker + GitHub Actions CI

## Roadmap

- [x] Project bootstrap, typed config validation
- [x] Health checks (liveness / readiness)
- [ ] Postgres + TypeORM, Redis, users, JWT auth
- [ ] pgvector semantic search module (embeddings service + cache + search API)
- [ ] Docker, CI, tests
- [ ] Architecture docs

## Getting started

```bash
cp .env.example .env
npm install
npm run start:dev
```

## License

MIT
