import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service.js';
import { PaymentConfirmedEvent } from './payments.types.js';

export type { PaymentConfirmedEvent };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly walletService: WalletService) {}

  async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    this.logger.log(
      `Payment confirmed: provider=${event.provider} paymentId=${event.paymentId} ` +
        `userId=${event.userId} amount=${event.amount}`,
    );

    try {
      await this.walletService.deposit(event.userId, {
        amount: event.amount,
        idempotencyKey: event.paymentId,
        description: event.description,
      });
      this.logger.log(
        `Deposit $${event.amount} credited to user ${event.userId} (${event.provider} ${event.paymentId})`,
      );
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        this.logger.error(
          `Wallet not found for userId=${event.userId} (${event.provider} ${event.paymentId})`,
        );
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to deposit for user ${event.userId} (${event.provider} ${event.paymentId}): ${msg}`,
        err,
      );
      throw err;
    }
  }
}
