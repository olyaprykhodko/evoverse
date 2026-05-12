import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { TransactionType } from '../../generated/prisma/enums.js';
import { sendResponse } from '../../utils/response.js';
import { DepositDto } from './dto/deposit.dto.js';

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
}
