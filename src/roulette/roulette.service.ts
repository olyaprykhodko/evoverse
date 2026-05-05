import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { PlaceBetDto } from './dto/place-bet.dto.js';
import { VerifyGameDto } from './dto/verify-game.dto.js';
import { sendResponse } from '../../utils/response.js';
import {
  BetType,
  PAYOUT_MULTIPLIERS,
  RED_NUMBERS,
} from './entities/bet-types.js';
import * as crypto from 'node:crypto';

@Injectable()
export class RouletteService {
  private readonly logger = new Logger(RouletteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: number, dto: CreateSessionDto) {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverHash = crypto
      .createHash('sha256')
      .update(serverSeed)
      .digest('hex');

    try {
      const session = await this.prisma.gameSession.create({
        data: {
          userId,
          serverSeed,
          serverHash,
          clientSeed: dto.clientSeed ?? null,
        },
        select: {
          id: true,
          serverHash: true,
          clientSeed: true,
          nonce: true,
        },
      });

      return sendResponse('Game session created', 201, session);
    } catch (err) {
      this.logger.error('Failed to create game session', err);
      throw new InternalServerErrorException();
    }
  }

  async placeBet(userId: number, dto: PlaceBetDto) {
    const { sessionId, type, targetNumber, amount, clientSeed } = dto;

    // Load session and profile in parallel
    const [session, profile] = await Promise.all([
      this.prisma.gameSession.findFirst({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          serverSeed: true,
          nonce: true,
          isOpen: true,
        },
      }),
      this.prisma.profiles.findFirst({
        where: { userId },
        select: { balance: true },
      }),
    ]);

    if (!session) throw new NotFoundException('Session not found');
    if (!session.isOpen)
      throw new BadRequestException('Session is already closed');
    if (session.userId !== userId)
      throw new ForbiddenException('Access to session denied');
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.balance.lessThan(amount))
      throw new BadRequestException('Insufficient balance');

    const result = this.calculateResult(
      session.serverSeed,
      clientSeed,
      session.nonce,
    );

    const isWin = this.checkWin(type, result, targetNumber);
    const payoutAmount = isWin ? amount * PAYOUT_MULTIPLIERS[type] : 0;

    const balanceDelta = payoutAmount - amount;

    try {
      const [bet] = await this.prisma.$transaction([
        this.prisma.rouletteBet.create({
          data: {
            userId,
            gameId: sessionId,
            betType: type,
            targetNumber: targetNumber ?? null,
            betAmount: amount,
            winningNumber: result,
            payoutAmount,
            isWin,
            nonce: session.nonce,
          },
          select: {
            id: true,
            betType: true,
            betAmount: true,
            winningNumber: true,
            payoutAmount: true,
            isWin: true,
            nonce: true,
          },
        }),
        this.prisma.gameSession.update({
          where: { id: sessionId },
          data: { nonce: { increment: 1 }, clientSeed },
        }),
        this.prisma.profiles.update({
          where: { userId },
          data: {
            balance: { increment: balanceDelta },
            ...(isWin && { rating: { increment: 1 } }),
          },
        }),
      ]);

      return sendResponse('Bet placed', 200, bet);
    } catch (err) {
      this.logger.error('Failed to place bet', err);
      throw new InternalServerErrorException();
    }
  }

  async leaveGame(userId: number, sessionId: string) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId },
      select: { id: true, userId: true, isOpen: true, serverSeed: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId)
      throw new ForbiddenException('Access to session denied');
    if (!session.isOpen)
      throw new BadRequestException('Session is already closed');

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { isOpen: false },
    });

    return sendResponse('Session closed', 200, {
      serverSeed: session.serverSeed,
    });
  }

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

  private calculateResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): number {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 37;
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
