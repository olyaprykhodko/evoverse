import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAccessStrategy } from '../../strategies/jwt-access.strategy.js';
import { JwtRefreshStrategy } from '../../strategies/jwt-refresh.strategy.js';
import { GoogleStrategy } from '../../strategies/google.strategy.js';
import { DiscordStrategy } from '../../strategies/discord.strategy.js';
import { VerificationModule } from './verification.module.js';

@Module({
  imports: [PassportModule, JwtModule.register({}), VerificationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    DiscordStrategy,
  ],
})
export class AuthModule {}
