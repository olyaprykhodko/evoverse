import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AddressModule } from './address/address.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, AddressModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
