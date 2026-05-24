import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../../../redis/redis.service.js';
import { RouletteService } from './roulette.service.js';
import { RouletteGateway } from './roulette.gateway.js';

const ROOM_META_KEY = 'roulette:room:meta';

@Injectable()
export class RouletteScheduler {
  private readonly logger = new Logger(RouletteScheduler.name);

  constructor(
    private readonly redis: RedisService,
    private readonly rouletteService: RouletteService,
    private readonly gateway: RouletteGateway,
  ) {}

  @Interval(1000)
  async tick(): Promise<void> {
    const client = this.redis.getClient();
    const ttl = await client.ttl(ROOM_META_KEY);

    if (ttl === -2) return;

    this.gateway.broadcastCountdown(ttl);

    if (ttl <= 1) {
      this.logger.log('Betting window expired — triggering auto-spin');
      try {
        await this.rouletteService.spinRoom();
      } catch (err) {
        this.logger.warn('Auto-spin skipped or failed', err);
      }
    }
  }
}
