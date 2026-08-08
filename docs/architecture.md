# Architecture

This document is about *why*, not *what* — the README and the code itself already cover what's here. This is the reasoning behind the decisions that aren't obvious from reading the source, plus a couple of real gotchas hit while building it.

## Module layout

`src/` is a flat set of self-contained Nest modules: `config` (env validation + typed config), `database` (TypeORM setup + migrations), `redis` (a single shared `ioredis` client behind a DI token), `users`, `auth`, `health`, `embeddings`, and `search`. Each is imported once into `AppModule`; `RedisModule` and `EmbeddingsModule` are marked `@Global()` so feature modules can inject their exports without re-importing them everywhere.

## Why pgvector

The embeddings live in the same Postgres instance as the rest of the app's data, rather than a separate vector database (Pinecone, Weaviate, Qdrant, etc.). For a starter template specifically, that's one less moving part: one connection pool, one backup story, one thing to run locally, and similarity search is just `ORDER BY embedding <=> $1 LIMIT $2` — plain SQL, not a second API to learn. It's also exactly the kind of infrastructure decision this repo exists to demonstrate: proof that the retrieval pipeline underneath a RAG feature can be built and reasoned about, not just wired up via a vendor SDK.

The trade-off is real at scale — a dedicated vector database will out-perform pgvector on very large corpora or very high query volume. For the corpus sizes a lot of internal tools and early-stage products actually have, that trade-off doesn't matter yet, and it's a much smaller lift to swap it out later than it is to run a second database from day one.

## Why cache embeddings in Redis

Embedding calls are the expensive part of this pipeline — money if you're calling a paid API, latency either way. `EmbeddingCacheService` (`src/embeddings/embedding-cache.service.ts`) sits in front of the embeddings provider and keys the cache on a SHA-256 hash of the input text *plus* the active provider name, so re-ingesting the same content, or repeating the same search query, never pays to embed it twice — and switching providers can't accidentally return a cached vector from a different embedding space.

## Why raw SQL for `documents`

TypeORM has no first-class `vector` column type. `SearchService` (`src/search/search.service.ts`) goes around the repository/entity pattern entirely for this one table — `ingest()` and `search()` both call `DataSource.query()` directly, casting the embedding to `::vector` as a Postgres array-literal string. Everywhere else in the app uses normal TypeORM entities and repositories; this is a deliberate, narrow exception, not the general pattern.

## The ivfflat lesson

The `documents` migration originally created its `ivfflat` index with `lists = 100` — a reasonable-looking default copied from pgvector's own docs. It shipped as `lists = 1` instead, and the reason is worth writing down rather than just leaving in a code comment.

`ivfflat` partitions vectors into `lists` clusters and, at query time, only probes the nearest `ivfflat.probes` of them (1 by default). If `lists` is much larger than the actual row count — or the index is built before any data exists at all, as it is in a fresh migration — the clustering is degenerate. A query can end up probing an empty cluster and silently return **zero rows**, even though matching documents exist in the table. This was reproduced directly: querying a single-row table with an unrelated vector returned nothing at `lists = 100`, and found the row correctly at `lists = 1` (which degenerates to an exact, brute-force scan).

`lists = 1` is the only safe default for an index built on an empty table. Bump it towards `sqrt(row count)` and `REINDEX` once the corpus is large enough for approximate search to actually pay off — and if search ever silently returns nothing for a query that should obviously match something, this is the first thing to check.

## Pluggable embeddings provider

`EmbeddingsProvider` (`src/embeddings/interfaces/embeddings-provider.interface.ts`) is a one-method interface — `embed(text) -> number[]`. Four implementations ship behind it, selected by `EMBEDDINGS_PROVIDER` in config with no changes needed anywhere that calls `EmbeddingCacheService`:

- **`onnx`** (default) — `OnnxEmbeddingsProvider` runs a real sentence-embedding model (`Xenova/all-MiniLM-L6-v2`, 384 dims) locally via `@xenova/transformers` (ONNX runtime, pure JS/WASM). No API key, no per-request network call, free. The model is downloaded and cached on first use; the pipeline is built once per process, not per request.
- **`openai`** — `OpenAiEmbeddingsProvider` calls OpenAI's embeddings API directly via `fetch` (no SDK dependency). Needs `OPENAI_API_KEY`.
- **`ollama`** — `OllamaEmbeddingsProvider` calls a local (or self-hosted) Ollama server's `/api/embeddings`. Free and private, but requires Ollama running with the model pulled separately.
- **`stub`** — `StubEmbeddingsProvider`, the original deterministic hash-seeded vector generator: same text always produces the same vector, no network call, no model download. Carries no real semantic meaning — useful for exercising the pipeline (cache, storage, similarity search) fast in tests, not for anything that needs real search quality.

`EMBEDDING_DIMENSIONS` must match whichever provider is active (`onnx`: 384, `openai`/`text-embedding-3-small`: 1536, `ollama`/`nomic-embed-text`: 768) — it's baked into the `documents.embedding` column's size at migration time (`src/database/migrations/1733000000000-CreateDocumentsTable.ts`), so switching providers with a different dimension count after documents already exist means re-running that migration and re-ingesting, not just flipping an env var.

One Docker-specific gotcha this surfaced: `onnxruntime-node`'s native binding (pulled in transitively by `@xenova/transformers`) ships prebuilt against glibc and fails to load under Alpine's musl libc (`Error loading shared library ld-linux-aarch64.so.1`) — this is why the Dockerfile's base image is `node:20-slim` (Debian, glibc), not `node:20-alpine`.

## Ops

The Dockerfile is a multi-stage build: a `builder` stage with full dev dependencies that compiles the app, and a slim `runtime` stage with production-only dependencies and just the compiled `dist/`, running as the non-root `node` user. One gotcha worth remembering: several source dotfiles (`tsconfig.json`, `.eslintrc.js`) are `600` on disk, and `COPY` preserves that mode — once root-owned in the image, the non-root user can't read them. Both `COPY` steps in the builder stage use `--chown=node:node` to fix that; without it, anything that needs those files at *runtime* (like running migrations via `ts-node` against the builder stage) breaks, even though the app's own `dist/`-only runtime stage works fine either way.

`docker-compose.yml` publishes Postgres/Redis on `5433`/`6380` on the host rather than the defaults — a deliberate accommodation for a dev machine that already runs native Postgres/Redis outside Docker, not a requirement of the app itself. Internal service-to-service traffic (the `migrate` and `app` services talking to `postgres`/`redis`) is unaffected, since that happens over the compose network at the default ports regardless of the host-side mapping.

CI (`.github/workflows/ci.yml`) runs lint, build, and tests on a Node 20.x/22.x matrix plus a Docker build sanity check on every push and PR to `master`/`develop`. No service containers are needed for the test job — every test mocks its dependencies (Redis client, embeddings provider, `DataSource`) rather than hitting real infrastructure.
