import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AddressModule } from './address/address.module.js';
import { AdminModule } from './admin/admin.module.js';
import { RouletteModule } from './roulette/roulette.module.js';
import { WalletModule } from './wallet/wallet.module.js';
import { PaymentsModule } from './payments/payments.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AddressModule,
    AdminModule,
    RouletteModule,
    WalletModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
