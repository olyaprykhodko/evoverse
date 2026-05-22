import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from '@songkeys/nestjs-redis-health';
import { ApiOperation } from '@nestjs/swagger';
import { RedisService } from '../../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly apiHealth: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
  })
  @HealthCheck()
  async healthChecks(): Promise<HealthCheckResult> {
    return await this.apiHealth.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () =>
        this.redisHealth.checkHealth('redis', {
          type: 'redis',
          client: this.redis.getClient(),
          timeout: 1000,
        }),
      () => ({
        environment: {
          status: 'up',
          environment: process.env.NODE_ENV ?? 'undefined',
          databaseName: process.env.POSTGRES_DB,
        },
      }),
    ]);
  }
}
