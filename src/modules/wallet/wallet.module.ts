import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { WalletService } from './wallet.service.js';
import { WalletController } from './wallet.controller.js';

@Module({
  imports: [PassportModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
