import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { StripeModule } from './stripe/stripe.module.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [StripeModule, WalletModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
