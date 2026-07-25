import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EmbeddingCacheService } from '../embeddings/embedding-cache.service';

export interface Document {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface SearchResult extends Document {
  distance: number;
}

/**
 * TypeORM has no first-class `vector` column type, so ingestion and
 * similarity search both go through raw SQL against the DataSource
 * instead of a repository/entity for `documents`.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly embeddings: EmbeddingCacheService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async ingest(content: string, metadata: Record<string, unknown> = {}): Promise<Document> {
    const embedding = await this.embeddings.embed(content);
    const rows = await this.dataSource.query(
      `INSERT INTO "documents" ("content", "metadata", "embedding")
       VALUES ($1, $2::jsonb, $3::vector)
       RETURNING "id", "content", "metadata", "created_at" AS "createdAt"`,
      [content, JSON.stringify(metadata), toVectorLiteral(embedding)],
    );
    return rows[0] as Document;
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const embedding = await this.embeddings.embed(query);
    const rows = await this.dataSource.query(
      `SELECT "id", "content", "metadata", "created_at" AS "createdAt",
              "embedding" <=> $1::vector AS "distance"
       FROM "documents"
       ORDER BY "embedding" <=> $1::vector
       LIMIT $2`,
      [toVectorLiteral(embedding), limit],
    );
    return rows as SearchResult[];
  }
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
