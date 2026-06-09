import {
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REFRESH_TOKEN_TTL } from './constants/tokens.js';

import * as crypto from 'node:crypto';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  getClient(): Redis {
    return this.redis;
  }

  sessionKey(userId: number): string {
    return `auth:session:${userId}`;
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async storeSession(userId: number, refreshToken: string): Promise<void> {
    await this.redis.set(
      this.sessionKey(userId),
      this.hashToken(refreshToken),
      'EX',
      REFRESH_TOKEN_TTL,
    );
  }

  async verifySession(userId: number, rawToken: string): Promise<void> {
    const stored = await this.redis.get(this.sessionKey(userId));
    if (!stored || stored !== this.hashToken(rawToken)) {
      throw new UnauthorizedException('Session expired or invalidated');
    }
  }

  async deleteSession(userId: number): Promise<void> {
    await this.redis.del(this.sessionKey(userId));
  }

  async storeEmailVerifyToken(userId: number, rawToken: string): Promise<void> {
    await this.redis.set(
      this.emailVerifyKey(this.hashToken(rawToken)),
      String(userId),
      'EX',
      60 * 60 * 24,
    );
  }

  async consumeEmailVerifyToken(rawToken: string): Promise<number | null> {
    const key = this.emailVerifyKey(this.hashToken(rawToken));
    const userId = await this.redis.get(key);
    if (!userId) return null;
    await this.redis.del(key);
    return Number(userId);
  }

  private emailVerifyKey(tokenHash: string): string {
    return `email:verify:${tokenHash}`;
  }
}
