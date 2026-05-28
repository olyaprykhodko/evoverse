import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RouletteService } from './roulette.service.js';
import { RouletteController } from './roulette.controller.js';
import { RouletteGateway } from './roulette.gateway.js';
import { RouletteScheduler } from './roulette.scheduler.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [PassportModule, WalletModule],
  controllers: [RouletteController],
  providers: [RouletteService, RouletteGateway, RouletteScheduler],
})
export class RouletteModule {}
