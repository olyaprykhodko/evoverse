import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { WeaponsService } from './weapons.service.js';
import { WeaponsController } from './weapons.controller.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [PassportModule, WalletModule],
  controllers: [WeaponsController],
  providers: [WeaponsService],
  exports: [WeaponsService],
})
export class WeaponsModule {}
