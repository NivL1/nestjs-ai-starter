import { MigrationInterface, QueryRunner } from 'typeorm';

const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? '1536', 10);

export class CreateDocumentsTable1733000000000 implements MigrationInterface {
  name = 'CreateDocumentsTable1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "content" text NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "embedding" vector(${EMBEDDING_DIMENSIONS}) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
      )
    `);

    // ivfflat partitions vectors into `lists` clusters and, at query time,
    // only probes the nearest `ivfflat.probes` of them (1 by default) — if
    // `lists` is much larger than the row count, clustering is degenerate
    // and a query can probe an empty cluster and silently return zero
    // rows even though matching documents exist. `lists = 1` (exact,
    // brute-force scan) is the only safe default on an index built before
    // any data — bump it towards sqrt(row count) and REINDEX once the
    // corpus is large enough for approximate search to pay off.
    await queryRunner.query(`
      CREATE INDEX "IDX_documents_embedding_ivfflat" ON "documents"
      USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "documents"`);
  }
}
