import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { RouletteGateway } from './roulette.gateway.js';
import { WalletService } from '../wallet/wallet.service.js';

import * as crypto from 'node:crypto';

import { sendResponse } from '../../common/utils/response.js';

import {
  tableMetaKey,
  tableBetsKey,
  tableLockKey,
} from './helpers/table-keys.helpers.js';
import { checkWin } from './helpers/checkWin.js';

import { PlaceRoomBetDto } from './dto/place-room-bet.dto.js';
import { VerifyGameDto } from './dto/verify-game.dto.js';
import type { RoomMeta } from './entities/room-entities.js';
import type { Bet } from './entities/bet-entities.js';
import { BetType } from './entities/bet-entities.js';
import {
  TABLE_IDS,
  TABLE_BETTING_TTL,
  TABLE_INITIAL_TTL,
  TABLE_NAMES,
} from './constants/room.constants.js';
import { PAYOUT_MULTIPLIERS } from './constants/bet.constants.js';
import { CoinTransactionType } from '../../../generated/prisma/enums.js';

@Injectable()
export class RouletteService {
  private readonly logger = new Logger(RouletteService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly gateway: RouletteGateway,
  ) {}

  async getHistory(userId: number, limit: number) {
    const bets = await this.prisma.rouletteBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        betType: true,
        targetNumber: true,
        betAmount: true,
        winningNumber: true,
        payoutAmount: true,
        isWin: true,
        nonce: true,
        createdAt: true,
        gameSession: {
          select: { id: true, serverHash: true, isOpen: true },
        },
      },
    });
    return sendResponse('Bet history fetched', 200, bets);
  }

  async getTables() {
    const redis = this.redis.getClient();
    const tables = await Promise.all(
      TABLE_IDS.map(async (tableId) => {
        const raw = await redis.get(tableMetaKey(tableId));
        const playerCount = this.gateway.getPlayerCount(tableId);
        if (!raw) {
          return {
            id: tableId,
            name: TABLE_NAMES[tableId],
            phase: 'waiting',
            expiresIn: 0,
            playerCount,
            betCount: 0,
          };
        }
        const meta = JSON.parse(raw) as RoomMeta;
        const ttl = await redis.ttl(tableMetaKey(tableId));
        const betCount = await redis.llen(tableBetsKey(tableId));
        return {
          id: tableId,
          name: TABLE_NAMES[tableId],
          phase: meta.phase,
          expiresIn: ttl > 0 ? ttl : 0,
          playerCount,
          betCount,
          serverHash: meta.serverHash,
        };
      }),
    );
    return sendResponse('Tables fetched', 200, tables);
  }

  async getRoomState(tableId: string) {
    const redis = this.redis.getClient();
    const metaKey = tableMetaKey(tableId);
    const raw = await redis.get(metaKey);

    if (!raw) {
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const serverHash = crypto
        .createHash('sha256')
        .update(serverSeed)
        .digest('hex');
      const meta: RoomMeta = {
        id: crypto.randomUUID(),
        tableId,
        serverSeed,
        serverHash,
        roundNonce: 0,
        phase: 'betting',
        createdAt: Date.now(),
      };
      const ttl = TABLE_INITIAL_TTL[tableId] ?? TABLE_BETTING_TTL;
      await redis.set(metaKey, JSON.stringify(meta), 'EX', ttl);
      return sendResponse('Table created', 201, {
        id: meta.id,
        tableId,
        serverHash: meta.serverHash,
        roundNonce: meta.roundNonce,
        phase: meta.phase,
        createdAt: meta.createdAt,
        expiresIn: ttl,
      });
    }

    const meta = JSON.parse(raw) as RoomMeta;
    const ttl = await redis.ttl(metaKey);
    return sendResponse('Table fetched', 200, {
      id: meta.id,
      tableId,
      serverHash: meta.serverHash,
      roundNonce: meta.roundNonce,
      phase: meta.phase,
      createdAt: meta.createdAt,
      expiresIn: ttl > 0 ? ttl : 0,
    });
  }

  async getTableBets(tableId: string) {
    const redis = this.redis.getClient();
    const betStrings = await redis.lrange(tableBetsKey(tableId), 0, -1);
    const bets = betStrings.map((b) => {
      const bet = JSON.parse(b) as Bet;
      return {
        userId: bet.userId,
        username: bet.username,
        betType: bet.type,
        targetNumber: bet.targetNumber,
        amount: bet.amount,
      };
    });
    return sendResponse('Table bets fetched', 200, bets);
  }

  async placeRoomBet(userId: number, dto: PlaceRoomBetDto) {
    const tableId = dto.tableId ?? 'table-1';
    const redis = this.redis.getClient();
    const metaKey = tableMetaKey(tableId);

    let raw = await redis.get(metaKey);
    if (!raw) {
      await this.getRoomState(tableId);
      raw = await redis.get(metaKey);
    }
    if (!raw) throw new NotFoundException('Table not available');

    const meta = JSON.parse(raw) as RoomMeta;
    if (meta.phase !== 'betting') {
      throw new BadRequestException('Betting phase is closed');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, coins: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.coins < dto.amount) {
      throw new BadRequestException(
        `Insufficient Glow Coins. You have ${wallet.coins} GC.`,
      );
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await this.walletService.processCoinTransaction(
        tx,
        wallet.id,
        CoinTransactionType.ROULETTE_BET,
        dto.amount,
        `${tableId}:${meta.id}`,
        `Roulette bet on ${TABLE_NAMES[tableId] ?? tableId}`,
      );
    });

    const bet: Bet = {
      userId,
      username: user?.username ?? `Player #${userId}`,
      clientSeed: dto.clientSeed,
      type: dto.type,
      targetNumber: dto.targetNumber,
      amount: dto.amount,
      placedAt: Date.now(),
    };

    const ttl = await redis.ttl(metaKey);
    const betsKey = tableBetsKey(tableId);
    await redis.rpush(betsKey, JSON.stringify(bet));
    await redis.expire(betsKey, ttl > 0 ? ttl : TABLE_BETTING_TTL);

    this.gateway.broadcastBetPlaced(tableId, {
      tableId,
      userId,
      username: bet.username,
      betType: dto.type,
      amount: dto.amount,
    });

    return sendResponse('Bet placed', 200, { tableId, expiresIn: ttl });
  }

  async spinRoom(tableId: string) {
    const redis = this.redis.getClient();
    const lockKey = tableLockKey(tableId);
    const locked = await redis.set(lockKey, '1', 'EX', 30, 'NX');
    if (!locked) throw new BadRequestException('Spin already in progress');

    try {
      const metaKey = tableMetaKey(tableId);
      const betsKey = tableBetsKey(tableId);

      const raw = await redis.get(metaKey);
      if (!raw) throw new NotFoundException('No active table');

      const meta = JSON.parse(raw) as RoomMeta;
      if (meta.phase !== 'betting') {
        throw new BadRequestException('Table is not in betting phase');
      }

      const betStrings = await redis.lrange(betsKey, 0, -1);
      const bets = betStrings.map((b) => JSON.parse(b) as Bet);

      const hmac = crypto.createHmac('sha256', meta.serverSeed);
      hmac.update(String(meta.roundNonce));
      const winningNumber =
        parseInt(hmac.digest('hex').substring(0, 8), 16) % 37;

      await redis.del(metaKey, betsKey);
      await this.settleRoomBets(bets, winningNumber, meta, tableId);

      const result = {
        tableId,
        winningNumber,
        serverSeed: meta.serverSeed,
        serverHash: meta.serverHash,
        roundNonce: meta.roundNonce,
        totalBets: bets.length,
      };

      this.gateway.broadcastResult(tableId, result);
      return sendResponse('Round completed', 200, result);
    } finally {
      await redis.del(tableLockKey(tableId));
    }
  }

  private async settleRoomBets(
    bets: Bet[],
    winningNumber: number,
    meta: RoomMeta,
    tableId: string,
  ): Promise<void> {
    const betsByUser = new Map<number, Bet[]>();
    for (const bet of bets) {
      betsByUser.set(bet.userId, [...(betsByUser.get(bet.userId) ?? []), bet]);
    }
    await Promise.allSettled(
      [...betsByUser.entries()].map(([userId, userBets]) =>
        this.settleUserBets(userId, userBets, winningNumber, meta, tableId),
      ),
    );
  }

  private async settleUserBets(
    userId: number,
    bets: Bet[],
    winningNumber: number,
    meta: RoomMeta,
    tableId: string,
  ): Promise<void> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      this.logger.warn(`Wallet not found for user ${userId} during settlement`);
      return;
    }

    try {
      const session = await this.prisma.gameSession.create({
        data: {
          userId,
          serverSeed: meta.serverSeed,
          serverHash: meta.serverHash,
          nonce: meta.roundNonce,
          isOpen: false,
        },
      });

      for (const bet of bets) {
        const isWin = checkWin(bet.type, winningNumber, bet.targetNumber);
        const payoutAmount = isWin
          ? bet.amount * PAYOUT_MULTIPLIERS[bet.type]
          : 0;

        await this.prisma.rouletteBet.create({
          data: {
            userId,
            gameId: session.id,
            betType: bet.type,
            targetNumber: bet.targetNumber ?? null,
            betAmount: bet.amount,
            winningNumber,
            payoutAmount,
            isWin,
            nonce: meta.roundNonce,
          },
        });

        if (isWin && payoutAmount > 0) {
          await this.prisma.$transaction(async (tx) => {
            await this.walletService.processCoinTransaction(
              tx,
              wallet.id,
              CoinTransactionType.ROULETTE_WIN,
              payoutAmount,
              session.id,
              `Win: ${bet.type} x${PAYOUT_MULTIPLIERS[bet.type]} on ${TABLE_NAMES[tableId] ?? tableId}`,
            );
          });

          const ratingIncrement = bet.type === BetType.STRAIGHT ? 3 : 1;
          await this.prisma.profiles.update({
            where: { userId },
            data: { rating: { increment: ratingIncrement } },
          });
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to settle bets for user ${userId} on ${tableId}`,
        err,
      );
    }
  }

  verifyResult(dto: VerifyGameDto) {
    const { serverSeed, clientSeed, nonce } = dto;
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hmacProof = hmac.digest('hex');
    const winningNumber = parseInt(hmacProof.substring(0, 8), 16) % 37;
    return sendResponse('Verification successful', 200, {
      winningNumber,
      hmacProof,
    });
  }
}
