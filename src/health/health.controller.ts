import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';

/**
 * Bare liveness probe for day-one deploys. Readiness (Postgres + Redis
 * connectivity) is added once the database and redis modules exist —
 * see DatabaseHealthIndicator / RedisHealthIndicator.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
