import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import {
  CoinTransactionType,
  TransactionType,
} from '../../../generated/prisma/enums.js';
import { sendResponse } from '../../common/utils/response.js';
import { DepositDto } from './dto/deposit.dto.js';
import { ConvertCoinsDto } from './dto/convert-coins.dto.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: number) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        updatedAt: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            amount: true,
            balanceBefore: true,
            balanceAfter: true,
            description: true,
            referenceId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!userWallet) throw new NotFoundException('Wallet not found');

    return sendResponse('Wallet fetched', 200, userWallet);
  }

  async getTransactionHistory(userId: number, limit: number) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!userWallet) throw new NotFoundException('Wallet not found');

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: userWallet.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        description: true,
        referenceId: true,
        createdAt: true,
      },
    });

    return sendResponse('Transaction history fetched', 200, transactions);
  }

  async deposit(userId: number, dto: DepositDto) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!userWallet) throw new NotFoundException('Wallet not found');

    try {
      const record = await this.prisma.$transaction(async (tx) => {
        return this.processTransaction(
          tx,
          userWallet.id,
          TransactionType.DEPOSIT,
          new Prisma.Decimal(dto.amount),
          dto.idempotencyKey,
          undefined,
          dto.description,
        );
      });

      return sendResponse('Deposit successful', 201, record);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.walletTransaction.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          select: {
            id: true,
            type: true,
            amount: true,
            balanceBefore: true,
            balanceAfter: true,
            createdAt: true,
          },
        });

        return sendResponse(
          'Deposit already processed (idempotent response)',
          200,
          existing,
        );
      }

      this.logger.error('Deposit failed', err);
      throw new InternalServerErrorException();
    }
  }

  async processTransaction(
    tx: Prisma.TransactionClient,
    walletId: string,
    type: TransactionType,
    amount: Prisma.Decimal,
    idempotencyKey: string,
    referenceId?: string,
    description?: string,
  ): Promise<Prisma.Decimal> {
    await tx.$queryRaw<
      unknown[]
    >`SELECT id FROM "wallet" WHERE id = ${walletId} FOR UPDATE`;

    const walletRow = await tx.wallet.findUnique({
      where: { id: walletId },
      select: { balance: true },
    });

    if (!walletRow) throw new NotFoundException('Wallet not found');

    const isCredit =
      type === TransactionType.DEPOSIT || type === TransactionType.PAYOUT;
    const balanceBefore: Prisma.Decimal = walletRow.balance;
    const balanceAfter: Prisma.Decimal = isCredit
      ? balanceBefore.plus(amount)
      : balanceBefore.minus(amount);

    if (!isCredit && balanceAfter.isNegative()) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    await tx.walletTransaction.create({
      data: {
        walletId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        idempotencyKey,
        referenceId,
        description,
      },
    });

    await tx.wallet.update({
      where: { id: walletId },
      data: { balance: balanceAfter },
    });

    return balanceAfter;
  }

  async getCoinBalance(userId: number) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { coins: true },
    });

    if (!userWallet) throw new NotFoundException('Wallet not found');

    return sendResponse('Coin balance fetched', 200, {
      coins: userWallet.coins,
    });
  }

  async getCoinTransactions(userId: number, limit: number) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!userWallet) throw new NotFoundException('Wallet not found');

    const transactions = await this.prisma.coinTransaction.findMany({
      where: { walletId: userWallet.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    });

    return sendResponse('Coin transactions fetched', 200, transactions);
  }

  async processCoinTransaction(
    tx: Prisma.TransactionClient,
    walletId: string,
    type: CoinTransactionType,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<number> {
    await tx.$queryRaw<
      unknown[]
    >`SELECT id FROM "wallet" WHERE id = ${walletId} FOR UPDATE`;

    const walletRow = await tx.wallet.findUnique({
      where: { id: walletId },
      select: { coins: true },
    });

    if (!walletRow) throw new NotFoundException('Wallet not found');

    const isCredit =
      type === CoinTransactionType.EARNED_BATTLE ||
      type === CoinTransactionType.ROULETTE_WIN ||
      type === CoinTransactionType.SLOT_WIN ||
      type === CoinTransactionType.PURCHASED_COINS;
    const balanceBefore = walletRow.coins;
    const balanceAfter = isCredit
      ? balanceBefore + amount
      : balanceBefore - amount;

    if (!isCredit && balanceAfter < 0) {
      throw new BadRequestException('Insufficient coin balance');
    }

    await tx.coinTransaction.create({
      data: {
        walletId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        referenceId,
        description,
      },
    });

    await tx.wallet.update({
      where: { id: walletId },
      data: { coins: balanceAfter },
    });

    return balanceAfter;
  }

  async convertCoinsToBalance(userId: number, dto: ConvertCoinsDto) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!userWallet) throw new NotFoundException('Wallet not found');

    const usdAmount = Math.floor(dto.amount / 100);
    if (usdAmount < 1) {
      throw new BadRequestException('Minimum cash-out is 100 Glow Coins ($1)');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await this.processCoinTransaction(
        tx,
        userWallet.id,
        CoinTransactionType.CONVERTED_TO_CASH,
        dto.amount,
        undefined,
        `Cashed out ${dto.amount} GC for $${usdAmount} USD`,
      );

      const newBalance = await this.processTransaction(
        tx,
        userWallet.id,
        TransactionType.DEPOSIT,
        new Prisma.Decimal(usdAmount),
        `gc-cashout-${userId}-${Date.now()}`,
        undefined,
        `Cash out from ${dto.amount} Glow Coins`,
      );

      return { usdReceived: usdAmount, coinsSpent: dto.amount, newBalance };
    });

    return sendResponse('Glow Coins cashed out', 200, result);
  }

  async buyGlowCoins(userId: number, usdAmount: number) {
    if (usdAmount < 1) {
      throw new BadRequestException('Minimum purchase is $1');
    }

    const glowCoins = usdAmount * 100;

    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, balance: true },
    });
    if (!userWallet) throw new NotFoundException('Wallet not found');
    if (userWallet.balance.lessThan(usdAmount)) {
      throw new BadRequestException(
        `Insufficient USD balance. You have $${userWallet.balance.toString()}.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await this.processTransaction(
        tx,
        userWallet.id,
        TransactionType.WITHDRAWAL,
        new Prisma.Decimal(usdAmount),
        `buy-gc-${userId}-${Date.now()}`,
        undefined,
        `Purchased ${glowCoins} Glow Coins`,
      );

      const newCoinBalance = await this.processCoinTransaction(
        tx,
        userWallet.id,
        CoinTransactionType.PURCHASED_COINS,
        glowCoins,
        undefined,
        `Purchased with $${usdAmount} USD`,
      );

      return { glowCoins, usdSpent: usdAmount, newCoinBalance };
    });

    return sendResponse('Glow Coins purchased', 200, result);
  }
}
