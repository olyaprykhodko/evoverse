import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service.js';
import type { PaymentConfirmedEvent } from './stripe/stripe.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly walletService: WalletService) {}

  async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    this.logger.log(
      `Payment confirmed: provider=${event.provider} paymentId=${event.paymentId} ` +
        `userId=${event.userId} amount=${event.amount}`,
    );

    await this.walletService.deposit(event.userId, {
      amount: event.amount,
      idempotencyKey: event.paymentId,
      description: event.description,
    });
  }
}
