import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BattleService } from './battle.service.js';
import { BattleGateway } from './battle.gateway.js';
import { BattleController } from './battle.controller.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [PassportModule, JwtModule.register({}), WalletModule],
  controllers: [BattleController],
  providers: [BattleService, BattleGateway],
})
export class BattleModule {}
