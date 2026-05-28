import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import * as crypto from 'node:crypto';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { WalletService } from '../wallet/wallet.service.js';

import { CoinTransactionType } from '../../../generated/prisma/enums.js';

import type * as runtime from '@prisma/client/runtime/client';

import { sendResponse } from '../../common/utils/response.js';

import { stateKey } from './helpers/stateKey.js';
import {
  type BattleRound,
  type QueueEntry,
  type MatchResult,
} from './entities/battle.entity.js';
import {
  BATTLE_HP,
  COINS_PER_STREAK_MILESTONE,
  STREAK_MILESTONE,
  QUEUE_KEY,
} from './constants/battle.constants.js';

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  async joinQueue(
    userId: number,
    socketId: string,
    weaponId: number,
  ): Promise<MatchResult | null> {
    const owns = await this.prisma.userWeapon.findUnique({
      where: { userId_weaponId: { userId, weaponId } },
    });

    if (!owns) throw new BadRequestException('You do not own this weapon');

    await this.removeFromQueue(userId);

    const entry: QueueEntry = { userId, socketId, weaponId };
    await this.redis.getClient().rpush(QUEUE_KEY, JSON.stringify(entry));

    const queueLen = await this.redis.getClient().llen(QUEUE_KEY);
    if (queueLen >= 2) {
      return await this.matchPlayers();
    }
    return null;
  }

  async removeFromQueue(userId: number): Promise<void> {
    const all = await this.redis.getClient().lrange(QUEUE_KEY, 0, -1);
    for (const raw of all) {
      const entry = JSON.parse(raw) as QueueEntry;
      if (entry.userId === userId) {
        await this.redis.getClient().lrem(QUEUE_KEY, 1, raw);
        break;
      }
    }
  }

  private async matchPlayers(): Promise<MatchResult | null> {
    const client = this.redis.getClient();
    const v1 = await client.lpop(QUEUE_KEY);
    const v2 = await client.lpop(QUEUE_KEY);
    const values: string[] = [v1, v2].filter(Boolean) as string[];
    if (values.length < 2) {
      for (const v of values) await client.rpush(QUEUE_KEY, v);
      return null;
    }

    const p1 = JSON.parse(values[0]) as QueueEntry;
    const p2 = JSON.parse(values[1]) as QueueEntry;

    const [weapon1, weapon2, user1, user2] = await Promise.all([
      this.prisma.weapon.findUnique({ where: { id: p1.weaponId } }),
      this.prisma.weapon.findUnique({ where: { id: p2.weaponId } }),
      this.prisma.users.findUnique({
        where: { id: p1.userId },
        select: { username: true, profile: { select: { avatar: true } } },
      }),
      this.prisma.users.findUnique({
        where: { id: p2.userId },
        select: { username: true, profile: { select: { avatar: true } } },
      }),
    ]);

    if (!weapon1 || !weapon2) {
      this.logger.error('Weapon not found during matchmaking');
      return null;
    }

    const battle = await this.prisma.battleSession.create({
      data: {
        player1Id: p1.userId,
        player2Id: p2.userId,
        weapon1Id: p1.weaponId,
        weapon2Id: p2.weaponId,
      },
    });

    const firstTurn = Math.random() < 0.5 ? p1.userId : p2.userId;
    const battleId = battle.id;

    const key = stateKey(battleId);
    await this.redis.getClient().hset(key, {
      hp1: BATTLE_HP,
      hp2: BATTLE_HP,
      currentTurnUserId: firstTurn,
      player1Id: p1.userId,
      player2Id: p2.userId,
      weapon1Id: p1.weaponId,
      weapon2Id: p2.weaponId,
      round: 1,
    });
    await this.redis.getClient().expire(key, 3600);

    return {
      battleId,
      p1: {
        socketId: p1.socketId,
        payload: {
          battleId,
          opponentId: p2.userId,
          opponentUsername: user2?.username ?? null,
          opponentAvatar: user2?.profile?.avatar ?? null,
          opponentWeapon: {
            id: weapon2.id,
            name: weapon2.name,
            rarity: weapon2.rarity,
            minDamage: Number(weapon2.minDamage),
            maxDamage: Number(weapon2.maxDamage),
          },
          yourTurn: firstTurn === p1.userId,
        },
      },
      p2: {
        socketId: p2.socketId,
        payload: {
          battleId,
          opponentId: p1.userId,
          opponentUsername: user1?.username ?? null,
          opponentAvatar: user1?.profile?.avatar ?? null,
          opponentWeapon: {
            id: weapon1.id,
            name: weapon1.name,
            rarity: weapon1.rarity,
            minDamage: Number(weapon1.minDamage),
            maxDamage: Number(weapon1.maxDamage),
          },
          yourTurn: firstTurn === p2.userId,
        },
      },
    };
  }

  async processAttack(attackerUserId: number, battleId: string) {
    const key = stateKey(battleId);
    const state = await this.redis.getClient().hgetall(key);

    if (!state || !state['currentTurnUserId']) {
      throw new NotFoundException('Battle not found or already finished');
    }

    if (Number(state['currentTurnUserId']) !== attackerUserId) {
      throw new BadRequestException('Not your turn');
    }

    const player1Id = Number(state['player1Id']);
    const player2Id = Number(state['player2Id']);
    const isAttackerP1 = attackerUserId === player1Id;
    const defenderId = isAttackerP1 ? player2Id : player1Id;

    const weaponId = isAttackerP1
      ? Number(state['weapon1Id'])
      : Number(state['weapon2Id']);
    const weapon = await this.prisma.weapon.findUnique({
      where: { id: weaponId },
    });
    if (!weapon) throw new NotFoundException('Weapon not found');

    const damage = crypto.randomInt(
      Number(weapon.minDamage),
      Number(weapon.maxDamage) + 1,
    );

    let hp1 = Number(state['hp1']);
    let hp2 = Number(state['hp2']);
    const round = Number(state['round']);

    if (isAttackerP1) {
      hp2 = Math.max(0, hp2 - damage);
    } else {
      hp1 = Math.max(0, hp1 - damage);
    }

    const roundResult: BattleRound = {
      round,
      attackerId: attackerUserId,
      defenderId,
      damage,
      hp1After: hp1,
      hp2After: hp2,
    };

    const isFinished = hp1 <= 0 || hp2 <= 0;

    if (isFinished) {
      await this.redis.getClient().del(key);
      const winnerId = hp1 > 0 ? player1Id : player2Id;
      const loserId = winnerId === player1Id ? player2Id : player1Id;
      await this.finishBattle(battleId, winnerId, loserId, [roundResult]);
      return { roundResult, finished: true, winnerId };
    }

    const nextTurn = isAttackerP1 ? player2Id : player1Id;
    await this.redis.getClient().hset(key, {
      hp1,
      hp2,
      currentTurnUserId: nextTurn,
      round: round + 1,
    });

    return { roundResult, finished: false, nextTurnUserId: nextTurn };
  }

  private async finishBattle(
    battleId: string,
    winnerId: number,
    loserId: number,
    rounds: BattleRound[],
  ): Promise<{ coinsEarned: number; newStreak: number }> {
    await this.prisma.battleSession.update({
      where: { id: battleId },
      data: {
        status: 'FINISHED',
        winnerId,
        rounds: rounds as unknown as runtime.InputJsonValue,
      },
    });

    const [winnerStats] = await Promise.all([
      this.prisma.battleStats.upsert({
        where: { userId: winnerId },
        create: {
          userId: winnerId,
          totalWins: 1,
          totalLosses: 0,
          currentStreak: 1,
          maxStreak: 1,
        },
        update: {
          totalWins: { increment: 1 },
          currentStreak: { increment: 1 },
          maxStreak: { increment: 1 },
        },
      }),
      this.prisma.battleStats.upsert({
        where: { userId: loserId },
        create: {
          userId: loserId,
          totalWins: 0,
          totalLosses: 1,
          currentStreak: 0,
          maxStreak: 0,
        },
        update: { totalLosses: { increment: 1 }, currentStreak: 0 },
      }),
    ]);

    await this.prisma.battleStats.update({
      where: { userId: winnerId },
      data: {
        maxStreak: {
          set: Math.max(
            Number(winnerStats.maxStreak),
            Number(winnerStats.currentStreak),
          ),
        },
      },
    });

    const isStreakMilestone =
      winnerStats.currentStreak % STREAK_MILESTONE === 0;
    let coinsEarned = 0;
    if (isStreakMilestone) {
      coinsEarned = COINS_PER_STREAK_MILESTONE;
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: winnerId },
        select: { id: true },
      });

      if (wallet) {
        await this.prisma.$transaction(async (tx) => {
          await this.walletService.processCoinTransaction(
            tx,
            wallet.id,
            CoinTransactionType.EARNED_BATTLE,
            coinsEarned,
            battleId,
            `Win streak milestone: ${winnerStats.currentStreak} wins`,
          );
        });
      }
    }

    const ratingIncrement = isStreakMilestone ? 3 : 1;
    await this.prisma.profiles.update({
      where: { userId: winnerId },
      data: { rating: { increment: ratingIncrement } },
    });

    return { coinsEarned, newStreak: winnerStats.currentStreak };
  }

  async handleDisconnect(userId: number): Promise<string | null> {
    await this.removeFromQueue(userId);

    const battle = await this.prisma.battleSession.findFirst({
      where: {
        status: 'IN_PROGRESS',
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      select: { id: true, player1Id: true, player2Id: true },
    });

    if (!battle) return null;

    const battleId = battle.id;
    const key = stateKey(battleId);
    await this.redis.getClient().del(key);

    await this.prisma.battleSession.update({
      where: { id: battleId },
      data: { status: 'ABANDONED', finishedAt: new Date() },
    });

    await this.prisma.battleStats.upsert({
      where: { userId },
      create: {
        userId,
        totalWins: 0,
        totalLosses: 1,
        currentStreak: 0,
        maxStreak: 0,
      },
      update: { totalLosses: { increment: 1 }, currentStreak: 0 },
    });

    return battleId;
  }

  async getHistory(userId: number, limit: number) {
    const battles = await this.prisma.battleSession.findMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        status: true,
        winnerId: true,
        createdAt: true,
        finishedAt: true,
        player1: { select: { id: true, username: true } },
        player2: { select: { id: true, username: true } },
        weapon1: { select: { id: true, name: true, rarity: true } },
        weapon2: { select: { id: true, name: true, rarity: true } },
        rounds: true,
      },
    });

    return sendResponse('Battle history fetched', 200, battles);
  }

  async getBattleStats(userId: number) {
    const stats = await this.prisma.battleStats.findUnique({
      where: { userId },
    });

    return sendResponse(
      'Battle stats fetched',
      200,
      stats ?? {
        userId,
        totalWins: 0,
        totalLosses: 0,
        currentStreak: 0,
        maxStreak: 0,
      },
    );
  }
}
