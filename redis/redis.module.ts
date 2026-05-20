import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  controllers: [],
  providers: [RedisService],
})
export class RedisModule {}
