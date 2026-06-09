import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { VerificationModule } from '../auth/verification.module.js';

@Module({
  imports: [VerificationModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
