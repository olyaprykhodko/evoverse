import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      password: process.env.REDIS_PASSWORD,
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  get(): Redis {
    return this.redis;
  }
}
