import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthModule } from '@songkeys/nestjs-redis-health';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule, RedisHealthModule],
  controllers: [HealthController],
})
export class HealthModule {}
