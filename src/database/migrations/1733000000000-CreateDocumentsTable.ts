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

    // ivfflat approximates nearest-neighbor search and clusters better with
    // data present; `lists = 100` is a reasonable starting point for a
    // starter template — tune towards sqrt(row count) as the table grows.
    await queryRunner.query(`
      CREATE INDEX "IDX_documents_embedding_ivfflat" ON "documents"
      USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "documents"`);
  }
}
