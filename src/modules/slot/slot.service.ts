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
import { sendResponse } from '../../common/utils/response.js';
import { SpinDto } from './dto/spin.dto.js';
import { VerifySpinDto } from './dto/verify-spin.dto.js';
import {
  REELS,
  REEL_LENGTH,
  PAYTABLE_3OAK,
  PAYTABLE_2OAK,
  SCALING_FACTOR,
  SLOT_SESSION_TTL,
  SlotSymbol,
} from './slot.constants.js';

interface SlotSession {
  serverSeed: string;
  serverHash: string;
  nonce: number;
}

interface WinResult {
  multiplier: number;
  winType: '3oak' | '2oak' | null;
}

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  // ─── Session ──────────────────────────────────────────────────────────────

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

  // ─── Spin ─────────────────────────────────────────────────────────────────

  async spin(userId: number, dto: SpinDto) {
    // Load or auto-create session
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

    // Check balance
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

    // Compute stops and symbols
    const stops = this.computeStops(serverSeed, dto.clientSeed, nonce);
    const symbols = stops.map((stop, i) => REELS[i][stop]) as [
      SlotSymbol,
      SlotSymbol,
      SlotSymbol,
    ];

    // Evaluate win
    const { multiplier, winType } = this.evaluateWin(symbols);
    const payoutAmount = Math.floor(dto.bet * multiplier * SCALING_FACTOR);
    const isWin = payoutAmount > 0;

    // Persist: deduct bet, credit win (if any), record spin — all in one transaction
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
          `Slot win: ${winType ?? ''} ×${multiplier}`,
        );
      }

      await tx.slotSpin.create({
        data: {
          userId,
          serverSeed,
          serverHash,
          clientSeed: dto.clientSeed,
          nonce,
          stop1: stops[0],
          stop2: stops[1],
          stop3: stops[2],
          sym1: symbols[0],
          sym2: symbols[1],
          sym3: symbols[2],
          betAmount: dto.bet,
          payoutAmount,
          isWin,
          winType: winType ?? null,
        },
      });
    });

    // Rotate to next seed (pre-commit for next spin)
    const next = await this.rotateSession(userId, nonce + 1);

    // Fetch updated coin balance
    const updatedWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { coins: true },
    });
    const coinsAfter = updatedWallet?.coins ?? 0;

    return sendResponse('Spin completed', 200, {
      stops,
      symbols,
      betAmount: dto.bet,
      payoutAmount,
      coinsAfter,
      isWin,
      winType: winType ?? null,
      provablyFair: {
        serverSeed, // revealed — client can now verify
        serverHash,
        clientSeed: dto.clientSeed,
        nonce,
      },
      next: { serverHash: next.serverHash, nonce: next.nonce },
    });
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async getHistory(userId: number, limit: number) {
    const spins = await this.prisma.slotSpin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        stop1: true,
        stop2: true,
        stop3: true,
        sym1: true,
        sym2: true,
        sym3: true,
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

  // ─── Verify ───────────────────────────────────────────────────────────────

  verifyResult(dto: VerifySpinDto) {
    const stops = this.computeStops(dto.serverSeed, dto.clientSeed, dto.nonce);
    const symbols = stops.map((stop, i) => REELS[i][stop]) as [
      SlotSymbol,
      SlotSymbol,
      SlotSymbol,
    ];
    const { winType, multiplier } = this.evaluateWin(symbols);
    const serverHash = crypto
      .createHash('sha256')
      .update(dto.serverSeed)
      .digest('hex');

    return sendResponse('Verification successful', 200, {
      stops,
      symbols,
      winType: winType ?? null,
      multiplier,
      serverHash,
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private computeStops(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
  ): [number, number, number] {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hex = hmac.digest('hex');
    return [
      parseInt(hex.slice(0, 8), 16) % REEL_LENGTH,
      parseInt(hex.slice(8, 16), 16) % REEL_LENGTH,
      parseInt(hex.slice(16, 24), 16) % REEL_LENGTH,
    ];
  }

  private evaluateWin(
    symbols: [SlotSymbol, SlotSymbol, SlotSymbol],
  ): WinResult {
    const [s1, s2, s3] = symbols;

    if (s1 === s2 && s2 === s3) {
      return { multiplier: PAYTABLE_3OAK[s1], winType: '3oak' };
    }
    // Left-to-right 2-of-a-kind: only first two reels count
    if (s1 === s2) {
      return { multiplier: PAYTABLE_2OAK[s1], winType: '2oak' };
    }
    // s1 === s3 or s2 === s3 do not pay in this model
    void s3;
    return { multiplier: 0, winType: null };
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
