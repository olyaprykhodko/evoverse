import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import * as crypto from 'node:crypto';

import type * as runtime from '@prisma/client/runtime/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { WalletService } from '../wallet/wallet.service.js';

import { CoinTransactionType } from '../../../generated/prisma/enums.js';

import { sendResponse } from '../../common/utils/response.js';

import { SpinDto } from './dto/spin.dto.js';
import { VerifySpinDto } from './dto/verify-spin.dto.js';
import {
  REELS,
  REEL_LENGTH,
  REEL_COUNT,
  ROW_COUNT,
  PAYLINES,
  LINE_COUNT,
  PAYTABLE,
  SCALING_FACTOR,
  SLOT_SESSION_TTL,
  SlotSymbol,
} from './slot.constants.js';
import {
  SlotSession,
  SpinEvaluation,
  LineWin,
} from './entities/slot.entities.js';

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  async getSession(userId: number) {
    const existing = await this.loadSession(userId);
    if (existing) {
      return sendResponse('Session fetched', 200, {
        serverHash: existing.serverHash,
        nonce: existing.nonce,
      });
    }
    const { serverHash, nonce } = await this.rotateSession(userId, 0);
    return sendResponse('Session created', 201, { serverHash, nonce });
  }

  async spin(userId: number, dto: SpinDto) {
    let session = await this.loadSession(userId);
    if (!session) {
      this.logger.log(`Auto-creating slot session for user ${userId}`);
      const seed = this.generateSeed();
      session = {
        serverSeed: seed.serverSeed,
        serverHash: seed.serverHash,
        nonce: 0,
      };
      await this.saveSession(userId, session);
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, coins: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.coins < dto.bet) {
      throw new BadRequestException(
        `Insufficient Glow Coins. You have ${wallet.coins} GC.`,
      );
    }

    const { serverSeed, serverHash, nonce } = session;

    const stops = this.computeStops(serverSeed, dto.clientSeed, nonce);
    const grid = this.buildGrid(stops);
    const { wins, totalMultiplier } = this.evaluateSpin(grid);

    const payoutAmount = Math.floor(
      (dto.bet / LINE_COUNT) * totalMultiplier * SCALING_FACTOR,
    );
    const isWin = payoutAmount > 0;
    const winType = this.summarizeWin(wins);

    await this.prisma.$transaction(async (tx) => {
      await this.walletService.processCoinTransaction(
        tx,
        wallet.id,
        CoinTransactionType.SLOT_BET,
        dto.bet,
        undefined,
        'Slot spin',
      );

      if (isWin) {
        await this.walletService.processCoinTransaction(
          tx,
          wallet.id,
          CoinTransactionType.SLOT_WIN,
          payoutAmount,
          undefined,
          `Slot win: ${winType ?? ''}`,
        );
      }

      await tx.slotSpin.create({
        data: {
          userId,
          serverSeed,
          serverHash,
          clientSeed: dto.clientSeed,
          nonce,
          stops,
          grid,
          wins: wins as unknown as runtime.InputJsonValue,
          betAmount: dto.bet,
          payoutAmount,
          isWin,
          winType: winType ?? null,
        },
      });
    });

    const next = await this.rotateSession(userId, nonce + 1);

    const updatedWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { coins: true },
    });
    const coinsAfter = updatedWallet?.coins ?? 0;

    return sendResponse('Spin completed', 200, {
      stops,
      grid,
      wins,
      winningLines: wins.map((w) => w.line),
      totalMultiplier,
      betAmount: dto.bet,
      payoutAmount,
      coinsAfter,
      isWin,
      winType: winType ?? null,
      provablyFair: {
        serverSeed,
        serverHash,
        clientSeed: dto.clientSeed,
        nonce,
      },
      next: { serverHash: next.serverHash, nonce: next.nonce },
    });
  }

  async getHistory(userId: number, limit: number) {
    const spins = await this.prisma.slotSpin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        stops: true,
        grid: true,
        wins: true,
        betAmount: true,
        payoutAmount: true,
        isWin: true,
        winType: true,
        clientSeed: true,
        nonce: true,
        serverHash: true,
        createdAt: true,
      },
    });
    return sendResponse('Spin history fetched', 200, spins);
  }

  verifyResult(dto: VerifySpinDto) {
    const stops = this.computeStops(dto.serverSeed, dto.clientSeed, dto.nonce);
    const grid = this.buildGrid(stops);
    const { wins, totalMultiplier } = this.evaluateSpin(grid);
    const serverHash = crypto
      .createHash('sha256')
      .update(dto.serverSeed)
      .digest('hex');

    return sendResponse('Verification successful', 200, {
      stops,
      grid,
      wins,
      winningLines: wins.map((w) => w.line),
      totalMultiplier,
      winType: this.summarizeWin(wins),
      serverHash,
    });
  }

  private computeStops(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): number[] {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hex = hmac.digest('hex');
    const stops: number[] = [];
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      const slice = hex.slice(reel * 8, reel * 8 + 8);
      stops.push(parseInt(slice, 16) % REEL_LENGTH);
    }
    return stops;
  }

  private buildGrid(stops: number[]): SlotSymbol[][] {
    return stops.map((stop, reel) => {
      const strip = REELS[reel];
      const cells: SlotSymbol[] = [];
      for (let row = 0; row < ROW_COUNT; row++) {
        cells.push(strip[(stop + row) % REEL_LENGTH]);
      }
      return cells;
    });
  }

  private evaluateSpin(grid: SlotSymbol[][]): SpinEvaluation {
    const wins: LineWin[] = [];
    let totalMultiplier = 0;

    PAYLINES.forEach((pattern, idx) => {
      const lineSymbols = pattern.map((row, reel) => grid[reel][row]);
      const { count, symbol } = this.evaluateLine(lineSymbols);
      if (symbol && count >= 3) {
        const multiplier = PAYTABLE[symbol]?.[count] ?? 0;
        if (multiplier > 0) {
          wins.push({ line: idx + 1, symbol, count, multiplier });
          totalMultiplier += multiplier;
        }
      }
    });

    return { wins, totalMultiplier };
  }

  private evaluateLine(symbols: SlotSymbol[]): {
    count: number;
    symbol: Exclude<SlotSymbol, SlotSymbol.WILD> | null;
  } {
    let target: SlotSymbol | null = null;
    for (const s of symbols) {
      if (s !== SlotSymbol.WILD) {
        target = s;
        break;
      }
    }
    if (target === null) return { count: 0, symbol: null }; // all WILDs

    let count = 0;
    for (const s of symbols) {
      if (s === target || s === SlotSymbol.WILD) count++;
      else break;
    }
    return { count, symbol: target };
  }

  private summarizeWin(wins: LineWin[]): string | null {
    if (wins.length === 0) return null;
    const best = wins.reduce((a, b) => (b.multiplier > a.multiplier ? b : a));
    return `${best.symbol} ×${best.count}`;
  }

  private generateSeed(): { serverSeed: string; serverHash: string } {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverHash = crypto
      .createHash('sha256')
      .update(serverSeed)
      .digest('hex');
    return { serverSeed, serverHash };
  }

  private async rotateSession(
    userId: number,
    nonce: number,
  ): Promise<{ serverHash: string; nonce: number }> {
    const { serverSeed, serverHash } = this.generateSeed();
    await this.saveSession(userId, { serverSeed, serverHash, nonce });
    return { serverHash, nonce };
  }

  private async loadSession(userId: number): Promise<SlotSession | null> {
    const raw = await this.redis.getClient().get(this.sessionKey(userId));
    return raw ? (JSON.parse(raw) as SlotSession) : null;
  }

  private async saveSession(
    userId: number,
    session: SlotSession,
  ): Promise<void> {
    await this.redis
      .getClient()
      .set(
        this.sessionKey(userId),
        JSON.stringify(session),
        'EX',
        SLOT_SESSION_TTL,
      );
  }

  private sessionKey(userId: number): string {
    return `slot:session:${userId}`;
  }
}
