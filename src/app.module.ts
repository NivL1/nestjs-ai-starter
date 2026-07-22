import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, validateEnv } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
