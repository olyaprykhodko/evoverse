import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PlaceRoomBetDto } from './dto/place-room-bet.dto.js';
import { VerifyGameDto } from './dto/verify-game.dto.js';
import type { RoomMeta, RoomBet } from './entities/game-room.js';
import { sendResponse } from '../../common/utils/response.js';
import {
  BetType,
  PAYOUT_MULTIPLIERS,
  RED_NUMBERS,
} from './entities/bet-types.js';
import * as crypto from 'node:crypto';
import { WalletService } from '../wallet/wallet.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { TransactionType } from '../../../generated/prisma/enums.js';
import { RedisService } from '../../../redis/redis.service.js';
import { RouletteGateway } from './roulette.gateway.js';

const ROOM_META_KEY = 'roulette:room:meta';
const ROOM_BETS_KEY = 'roulette:room:bets';
const ROOM_LOCK_KEY = 'roulette:room:lock';
const ROOM_BETTING_TTL = 60;

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

  async getRoomState() {
    const redis = this.redis.getClient();
    const raw = await redis.get(ROOM_META_KEY);

    if (!raw) {
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const serverHash = crypto
        .createHash('sha256')
        .update(serverSeed)
        .digest('hex');
      const meta: RoomMeta = {
        id: crypto.randomUUID(),
        serverSeed,
        serverHash,
        roundNonce: 0,
        phase: 'betting',
        createdAt: Date.now(),
      };
      await redis.set(
        ROOM_META_KEY,
        JSON.stringify(meta),
        'EX',
        ROOM_BETTING_TTL,
      );
      return sendResponse('Room created', 201, {
        id: meta.id,
        serverHash: meta.serverHash,
        roundNonce: meta.roundNonce,
        phase: meta.phase,
        createdAt: meta.createdAt,
      });
    }

    const meta = JSON.parse(raw) as RoomMeta;
    const ttl = await redis.ttl(ROOM_META_KEY);
    return sendResponse('Room fetched', 200, {
      id: meta.id,
      serverHash: meta.serverHash,
      roundNonce: meta.roundNonce,
      phase: meta.phase,
      createdAt: meta.createdAt,
      expiresIn: ttl,
    });
  }

  async placeRoomBet(userId: number, dto: PlaceRoomBetDto) {
    const redis = this.redis.getClient();
    const raw = await redis.get(ROOM_META_KEY);

    if (!raw) {
      throw new NotFoundException(
        'No active room. Call GET /roulette/room first',
      );
    }

    const meta = JSON.parse(raw) as RoomMeta;
    if (meta.phase !== 'betting') {
      throw new BadRequestException('Betting phase is closed');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balance.lessThan(dto.amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    const bet: RoomBet = {
      userId,
      clientSeed: dto.clientSeed,
      type: dto.type,
      targetNumber: dto.targetNumber,
      amount: dto.amount,
      placedAt: Date.now(),
    };

    const ttl = await redis.ttl(ROOM_META_KEY);
    await redis.rpush(ROOM_BETS_KEY, JSON.stringify(bet));
    await redis.expire(ROOM_BETS_KEY, ttl > 0 ? ttl : ROOM_BETTING_TTL);

    return sendResponse('Bet placed in room', 200, {
      roomId: meta.id,
      expiresIn: ttl,
    });
  }

  async spinRoom() {
    const redis = this.redis.getClient();
    const locked = await redis.set(ROOM_LOCK_KEY, '1', 'EX', 30, 'NX');
    if (!locked) {
      throw new BadRequestException('Spin already in progress');
    }

    try {
      const raw = await redis.get(ROOM_META_KEY);
      if (!raw) throw new NotFoundException('No active room');

      const meta = JSON.parse(raw) as RoomMeta;
      if (meta.phase !== 'betting') {
        throw new BadRequestException('Room is not in betting phase');
      }

      const betStrings = await redis.lrange(ROOM_BETS_KEY, 0, -1);
      const bets = betStrings.map((b) => JSON.parse(b) as RoomBet);

      const hmac = crypto.createHmac('sha256', meta.serverSeed);
      hmac.update(String(meta.roundNonce));
      const winningNumber =
        parseInt(hmac.digest('hex').substring(0, 8), 16) % 37;

      await redis.del(ROOM_META_KEY, ROOM_BETS_KEY);
      await this.settleRoomBets(bets, winningNumber, meta);

      const result = {
        winningNumber,
        serverSeed: meta.serverSeed,
        serverHash: meta.serverHash,
        roundNonce: meta.roundNonce,
        totalBets: bets.length,
      };

      this.gateway.broadcastResult(result);

      return sendResponse('Round completed', 200, result);
    } finally {
      await redis.del(ROOM_LOCK_KEY);
    }
  }

  private async settleRoomBets(
    bets: RoomBet[],
    winningNumber: number,
    meta: RoomMeta,
  ): Promise<void> {
    const betsByUser = new Map<number, RoomBet[]>();
    for (const bet of bets) {
      betsByUser.set(bet.userId, [...(betsByUser.get(bet.userId) ?? []), bet]);
    }
    await Promise.allSettled(
      [...betsByUser.entries()].map(([userId, userBets]) =>
        this.settleUserBets(userId, userBets, winningNumber, meta),
      ),
    );
  }

  private async settleUserBets(
    userId: number,
    bets: RoomBet[],
    winningNumber: number,
    meta: RoomMeta,
  ): Promise<void> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      this.logger.warn(
        `Wallet not found for user ${userId} during room settlement`,
      );
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const session = await tx.gameSession.create({
          data: {
            userId,
            serverSeed: meta.serverSeed,
            serverHash: meta.serverHash,
            nonce: meta.roundNonce,
            isOpen: false,
          },
        });

        for (const bet of bets) {
          const isWin = this.checkWin(
            bet.type,
            winningNumber,
            bet.targetNumber,
          );
          const payoutAmount = isWin
            ? bet.amount * PAYOUT_MULTIPLIERS[bet.type]
            : 0;

          await this.walletService.processTransaction(
            tx,
            wallet.id,
            TransactionType.WITHDRAWAL,
            new Prisma.Decimal(bet.amount),
            `room-bet:${meta.id}:${userId}:${bet.placedAt}`,
            session.id,
            'Roulette room bet',
          );

          if (isWin && payoutAmount > 0) {
            await this.walletService.processTransaction(
              tx,
              wallet.id,
              TransactionType.PAYOUT,
              new Prisma.Decimal(payoutAmount),
              `room-payout:${meta.id}:${userId}:${bet.placedAt}`,
              session.id,
              'Roulette room payout',
            );
          }

          await tx.rouletteBet.create({
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

          if (isWin) {
            await tx.profiles.update({
              where: { userId },
              data: { rating: { increment: 1 } },
            });
          }
        }
      });
    } catch (err) {
      this.logger.error(`Failed to settle room bets for user ${userId}`, err);
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

  private checkWin(
    type: BetType,
    winningNumber: number,
    targetNumber?: number,
  ): boolean {
    if (winningNumber === 0) {
      return type === BetType.STRAIGHT && targetNumber === 0;
    }

    switch (type) {
      case BetType.STRAIGHT:
        return winningNumber === targetNumber;
      case BetType.RED:
        return RED_NUMBERS.has(winningNumber);
      case BetType.BLACK:
        return !RED_NUMBERS.has(winningNumber);
      case BetType.EVEN:
        return winningNumber % 2 === 0;
      case BetType.ODD:
        return winningNumber % 2 !== 0;
      case BetType.DOZEN:
        if (targetNumber === 1)
          return winningNumber >= 1 && winningNumber <= 12;
        if (targetNumber === 2)
          return winningNumber >= 13 && winningNumber <= 24;
        if (targetNumber === 3)
          return winningNumber >= 25 && winningNumber <= 36;
        return false;
    }
  }
}
