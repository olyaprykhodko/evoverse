import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
