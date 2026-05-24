import { TransactionType } from '../../../../generated/prisma/enums.js';
import { User } from '../../users/entities/user.entity.js';

export class Wallet {
  id: string;
  userId: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  transactions: WalletTransactions;
}

export class WalletTransactions {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  idempotencyKey: string;
  description?: string;
  referenceId: string;
  createdAt: Date;
  wallet: Wallet;
}
