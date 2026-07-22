import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const healthy = pong === 'PONG';
      const result = { [key]: { status: healthy ? 'up' : 'down' } };
      if (!healthy) {
        throw new HealthCheckError('Redis ping failed', result);
      }
      return result;
    } catch (err) {
      const result = { [key]: { status: 'down', message: (err as Error).message } };
      throw new HealthCheckError('Redis check failed', result);
    }
  }
}
