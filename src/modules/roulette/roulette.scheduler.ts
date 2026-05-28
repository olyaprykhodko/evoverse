import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { RedisService } from '../../../redis/redis.service.js';
import { RouletteService } from './roulette.service.js';
import { RouletteGateway } from './roulette.gateway.js';

import { TABLE_IDS } from './constants/room.constants.js';
import { tableMetaKey } from './helpers/table-keys.helpers.js';

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
    await Promise.all(TABLE_IDS.map((id) => this.tickTable(id)));
  }

  private async tickTable(tableId: string): Promise<void> {
    const client = this.redis.getClient();
    const metaKey = tableMetaKey(tableId);
    let ttl = await client.ttl(metaKey);

    if (ttl === -2) {
      try {
        await this.rouletteService.getRoomState(tableId);
        ttl = await client.ttl(metaKey);
      } catch {
        return;
      }
    }

    this.gateway.broadcastCountdown(tableId, ttl);

    if (ttl <= 1) {
      this.logger.log(`Betting window expired on ${tableId} — auto-spin`);
      try {
        await this.rouletteService.spinRoom(tableId);
      } catch (err) {
        this.logger.warn(`Auto-spin skipped on ${tableId}`, err);
      }
    }
  }
}
