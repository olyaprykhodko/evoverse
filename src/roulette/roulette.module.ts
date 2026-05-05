import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RouletteService } from './roulette.service.js';
import { RouletteController } from './roulette.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [RouletteController],
  providers: [RouletteService],
})
export class RouletteModule {}
