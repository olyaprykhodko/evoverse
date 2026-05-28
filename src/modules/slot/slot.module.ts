import { Module } from '@nestjs/common';
import { SlotService } from './slot.service.js';
import { SlotController } from './slot.controller.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [WalletModule],
  controllers: [SlotController],
  providers: [SlotService],
})
export class SlotModule {}
