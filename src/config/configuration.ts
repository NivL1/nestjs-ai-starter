import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(0)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsBoolean()
  @IsOptional()
  // `enableImplicitConversion` runs its own naive `Boolean(value)` coercion
  // before this decorator sees `value`, so "false" (any non-empty string)
  // already comes in as `true` by the time a `value`-based Transform would
  // run. Reading the untouched string straight off `obj` avoids that.
  @Transform(({ obj }) => obj.DATABASE_SSL === 'true')
  DATABASE_SSL: boolean = false;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL: string = '900s';

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL: string = '7d';

  @IsIn(['openai'])
  @IsOptional()
  EMBEDDINGS_PROVIDER: string = 'openai';

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string = '';

  @IsString()
  @IsOptional()
  OPENAI_EMBEDDING_MODEL: string = 'text-embedding-3-small';

  @IsInt()
  @IsOptional()
  EMBEDDING_DIMENSIONS: number = 1536;

  @IsInt()
  @IsOptional()
  EMBEDDING_CACHE_TTL_SECONDS: number = 2592000;
}

/**
 * Validates process.env against EnvironmentVariables at boot time, so a
 * missing or malformed secret fails fast with a clear error instead of
 * surfacing as a confusing runtime crash three requests later.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('\n');
    throw new Error(`Config validation error:\n${messages}`);
  }

  return validated;
}

export interface AppConfig {
  env: string;
  port: number;
  database: { url: string; ssl: boolean };
  redis: { url: string };
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
  };
  embeddings: {
    provider: string;
    openaiApiKey: string;
    openaiModel: string;
    dimensions: number;
    cacheTtlSeconds: number;
  };
}

export function configuration(): AppConfig {
  return {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    database: {
      url: process.env.DATABASE_URL ?? '',
      ssl: process.env.DATABASE_SSL === 'true',
    },
    redis: {
      url: process.env.REDIS_URL ?? '',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    },
    embeddings: {
      provider: process.env.EMBEDDINGS_PROVIDER ?? 'openai',
      openaiApiKey: process.env.OPENAI_API_KEY ?? '',
      openaiModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS ?? '1536', 10),
      cacheTtlSeconds: parseInt(process.env.EMBEDDING_CACHE_TTL_SECONDS ?? '2592000', 10),
    },
  };
}
