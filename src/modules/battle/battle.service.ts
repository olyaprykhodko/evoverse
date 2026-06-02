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
  type ZoneMove,
  type ResolvedRound,
  type SubmitMoveResult,
  type Weapon,
} from './entities/battle.entity.js';
import {
  BATTLE_HP,
  COINS_PER_STREAK_MILESTONE,
  STREAK_MILESTONE,
  QUEUE_KEY,
  ATTACK_ZONES,
  MOVE_TIMEOUT_MS,
  BLOCKED_DAMAGE_MULTIPLIER,
  DEADLINES_KEY,
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

    const queueLength = await this.redis.getClient().llen(QUEUE_KEY);
    if (queueLength >= 2) {
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

    const battleId = battle.id;
    const roundEndsAt = Date.now() + MOVE_TIMEOUT_MS;

    const key = stateKey(battleId);
    await this.redis.getClient().hset(key, {
      hp1: BATTLE_HP,
      hp2: BATTLE_HP,
      player1Id: p1.userId,
      player2Id: p2.userId,
      weapon1Id: p1.weaponId,
      weapon2Id: p2.weaponId,
      round: 1,
      deadline: roundEndsAt,
    });
    await this.redis.getClient().expire(key, 3600);
    await this.redis
      .getClient()
      .zadd(DEADLINES_KEY, roundEndsAt, this.deadlineMember(battleId, 1));

    return {
      battleId,
      p1: {
        socketId: p1.socketId,
        payload: {
          battleId,
          player1Id: p1.userId,
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
          roundEndsAt,
        },
      },
      p2: {
        socketId: p2.socketId,
        payload: {
          battleId,
          player1Id: p1.userId,
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
          roundEndsAt,
        },
      },
    };
  }

  async submitMove(
    userId: number,
    battleId: string,
    move: ZoneMove,
  ): Promise<SubmitMoveResult> {
    this.validateMove(move);

    return this.withLock(battleId, async (): Promise<SubmitMoveResult> => {
      const client = this.redis.getClient();
      const key = stateKey(battleId);
      const state = await client.hgetall(key);

      if (!state || !state['player1Id']) {
        throw new NotFoundException('Battle not found or already finished');
      }

      const player1Id = Number(state['player1Id']);
      const player2Id = Number(state['player2Id']);
      if (userId !== player1Id && userId !== player2Id) {
        throw new BadRequestException('You are not part of this battle');
      }

      const isP1 = userId === player1Id;
      const myField = isP1 ? 'move1' : 'move2';
      if (state[myField]) {
        throw new BadRequestException('You have already moved this round');
      }

      await client.hset(key, { [myField]: JSON.stringify(move) });

      const otherRaw = isP1 ? state['move2'] : state['move1'];
      if (!otherRaw) {
        return { status: 'waiting' as const };
      }

      const otherMove = JSON.parse(otherRaw) as ZoneMove;
      const move1 = isP1 ? move : otherMove;
      const move2 = isP1 ? otherMove : move;
      return this.resolveRound(battleId, state, move1, move2);
    });
  }

  async forceResolveRound(
    battleId: string,
    expectedRound: number,
  ): Promise<ResolvedRound | null> {
    return this.withLock(battleId, async (): Promise<ResolvedRound | null> => {
      const client = this.redis.getClient();
      const key = stateKey(battleId);
      const state = await client.hgetall(key);

      if (!state || !state['player1Id']) return null;
      if (Number(state['round']) !== expectedRound) return null;

      const idle: ZoneMove = { attackZone: null, defenseZone: null };
      const move1 = state['move1']
        ? (JSON.parse(state['move1']) as ZoneMove)
        : idle;
      const move2 = state['move2']
        ? (JSON.parse(state['move2']) as ZoneMove)
        : idle;

      return this.resolveRound(battleId, state, move1, move2);
    });
  }

  private async resolveRound(
    battleId: string,
    state: Record<string, string>,
    move1: ZoneMove,
    move2: ZoneMove,
  ): Promise<ResolvedRound> {
    const client = this.redis.getClient();
    const key = stateKey(battleId);
    const player1Id = Number(state['player1Id']);
    const player2Id = Number(state['player2Id']);
    const round = Number(state['round']);

    const [weapon1, weapon2] = await Promise.all([
      this.prisma.weapon.findUnique({
        where: { id: Number(state['weapon1Id']) },
      }),
      this.prisma.weapon.findUnique({
        where: { id: Number(state['weapon2Id']) },
      }),
    ]);
    if (!weapon1 || !weapon2) throw new NotFoundException('Weapon not found');

    const damageTo2 = this.computeDamage(
      weapon1,
      move1.attackZone,
      move2.defenseZone,
    );
    const damageTo1 = this.computeDamage(
      weapon2,
      move2.attackZone,
      move1.defenseZone,
    );

    const raw1 = Number(state['hp1']) - damageTo1;
    const raw2 = Number(state['hp2']) - damageTo2;
    const hp1 = Math.max(0, raw1);
    const hp2 = Math.max(0, raw2);

    const bothIdle = !move1.attackZone && !move2.attackZone;

    const roundResult: BattleRound = {
      round,
      move1,
      move2,
      damageTo1,
      damageTo2,
      hp1After: hp1,
      hp2After: hp2,
    };

    const prevRounds = state['rounds']
      ? (JSON.parse(state['rounds']) as BattleRound[])
      : [];
    const allRounds = [...prevRounds, roundResult];

    await client.zrem(DEADLINES_KEY, this.deadlineMember(battleId, round));

    const finished = hp1 <= 0 || hp2 <= 0 || bothIdle;
    if (finished) {
      await client.del(key);

      const winnerId = raw1 >= raw2 ? player1Id : player2Id;
      const loserId = winnerId === player1Id ? player2Id : player1Id;
      await this.finishBattle(battleId, winnerId, loserId, allRounds);
      return {
        status: 'resolved',
        round: roundResult,
        finished: true,
        winnerId,
      };
    }

    const nextRound = round + 1;
    const roundEndsAt = Date.now() + MOVE_TIMEOUT_MS;
    await client.hset(key, {
      hp1,
      hp2,
      round: nextRound,
      rounds: JSON.stringify(allRounds),
      deadline: roundEndsAt,
    });
    await client.hdel(key, 'move1', 'move2');
    await client.expire(key, 3600);
    await client.zadd(
      DEADLINES_KEY,
      roundEndsAt,
      this.deadlineMember(battleId, nextRound),
    );

    return {
      status: 'resolved',
      round: roundResult,
      finished: false,
      nextRound,
      roundEndsAt,
    };
  }

  private computeDamage(
    weapon: Weapon,
    attackZone: ZoneMove['attackZone'],
    defenseZone: ZoneMove['defenseZone'],
  ): number {
    if (!attackZone) return 0;
    const damage = crypto.randomInt(
      Number(weapon.minDamage),
      Number(weapon.maxDamage) + 1,
    );
    return defenseZone === attackZone
      ? Math.round(damage * BLOCKED_DAMAGE_MULTIPLIER)
      : damage;
  }

  private validateMove(move: ZoneMove): void {
    const zones = ATTACK_ZONES as readonly string[];
    if (
      !move ||
      !zones.includes(move.attackZone as string) ||
      !zones.includes(move.defenseZone as string)
    ) {
      throw new BadRequestException(
        'Invalid move: attackZone and defenseZone must be head, body or legs',
      );
    }
  }

  private deadlineMember(battleId: string, round: number): string {
    return `${battleId}:${round}`;
  }

  async claimDueRounds(
    now: number = Date.now(),
  ): Promise<{ battleId: string; round: number }[]> {
    const client = this.redis.getClient();
    const due = await client.zrangebyscore(DEADLINES_KEY, '-inf', now);

    const claimed: { battleId: string; round: number }[] = [];
    for (const member of due) {
      const removed = await client.zrem(DEADLINES_KEY, member);
      if (removed !== 1) continue;
      const sep = member.lastIndexOf(':');
      claimed.push({
        battleId: member.slice(0, sep),
        round: Number(member.slice(sep + 1)),
      });
    }
    return claimed;
  }

  private readonly chains = new Map<string, Promise<void>>();

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const mine = prev.then(
      () => gate,
      () => gate,
    );
    this.chains.set(key, mine);

    await prev.catch(() => {});
    try {
      return await fn();
    } finally {
      release();
      if (this.chains.get(key) === mine) this.chains.delete(key);
    }
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
    const roundRaw = await this.redis.getClient().hget(key, 'round');
    const round = Number(roundRaw ?? 0);
    await this.redis.getClient().del(key);
    this.chains.delete(battleId);
    if (round > 0) {
      await this.redis
        .getClient()
        .zrem(DEADLINES_KEY, this.deadlineMember(battleId, round));
    }

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
