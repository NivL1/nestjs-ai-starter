import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingCacheService } from './embedding-cache.service';
import { EMBEDDINGS_PROVIDER } from './embeddings.constants';
import { EmbeddingsProvider } from './interfaces/embeddings-provider.interface';
import { LocalEmbeddingsProvider } from './providers/local-embeddings.provider';

@Global()
@Module({
  providers: [
    {
      provide: EMBEDDINGS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmbeddingsProvider => {
        const provider = config.get<string>('embeddings.provider');
        switch (provider) {
          case 'local':
            return new LocalEmbeddingsProvider(config);
          default:
            throw new Error(
              `Unsupported EMBEDDINGS_PROVIDER "${provider}" — only "local" is implemented so far.`,
            );
        }
      },
    },
    EmbeddingCacheService,
  ],
  exports: [EmbeddingCacheService],
})
export class EmbeddingsModule {}
