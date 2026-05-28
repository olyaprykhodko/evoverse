import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [WalletModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
