import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('nestjs-ai-starter')
    .setDescription(
      'Production-grade NestJS microservice starter with Postgres, Redis, JWT auth, and a pgvector semantic search module.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  Logger.log(`nestjs-ai-starter listening on :${port} (docs at /docs)`, 'Bootstrap');
}

void bootstrap();
