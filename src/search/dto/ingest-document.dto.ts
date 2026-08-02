import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class IngestDocumentDto {
  @ApiProperty({ example: 'Postgres is a powerful open source relational database.' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ example: { source: 'docs' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
