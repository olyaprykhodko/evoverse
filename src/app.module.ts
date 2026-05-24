import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AddressModule } from './modules/address/address.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { RouletteModule } from './modules/roulette/roulette.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    AddressModule,
    AdminModule,
    RouletteModule,
    WalletModule,
    PaymentsModule,
    RedisModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
