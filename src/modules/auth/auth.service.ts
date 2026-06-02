import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { LoginDto } from './dto/login.dto.js';
import { sendResponse } from '../../common/utils/response.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';
import * as argon2 from 'argon2';
import { GoogleProfile } from '../../common/types/google.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.users.findFirst({
      where: { email, isDeleted: false },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isBanned: true,
        banEndAt: true,
      },
    });

    if (!user || !user.password)
      throw new UnauthorizedException('Invalid email or password');

    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid)
      throw new UnauthorizedException('Invalid email or password');

    if (user.isBanned) {
      const bannedUntil = user.banEndAt
        ? ` until ${user.banEndAt.toISOString()}`
        : ' permanently';
      throw new ForbiddenException(`Account is banned ${bannedUntil}`);
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email!,
      role: user.role,
    });

    await Promise.all([
      this.prisma.users.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.redisService.storeSession(user.id, tokens.refreshToken),
    ]);

    return sendResponse('Login successful', 200, tokens);
  }

  async refresh(payload: JwtPayload, rawRefreshToken: string) {
    await this.redisService.verifySession(payload.sub, rawRefreshToken);

    const user = await this.prisma.users.findFirst({
      where: { id: payload.sub, isDeleted: false, isBanned: false },
      select: { id: true, email: true, role: true },
    });

    if (!user) throw new UnauthorizedException();

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email!,
      role: user.role,
    });

    await this.redisService.storeSession(user.id, tokens.refreshToken);

    return sendResponse('Tokens refreshed', 200, tokens);
  }

  async logout(userId: number) {
    await this.redisService.deleteSession(userId);
    return sendResponse('Logged out successfully', 200);
  }

  async validateGoogleUser(profile: GoogleProfile) {
    const { googleId, email, displayName, avatar } = profile;

    let user = await this.prisma.users.findFirst({
      where: {
        googleId,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isBanned: true,
      },
    });

    if (!user && email) {
      const byEmail = await this.prisma.users.findFirst({
        where: { email, isDeleted: false },
        select: { id: true },
      });
      if (byEmail) {
        user = await this.prisma.users.update({
          where: { id: byEmail.id },
          data: { googleId },
          select: {
            id: true,
            email: true,
            role: true,
            isBanned: true,
            banEndAt: true,
          },
        });
      }
    }

    if (!user) {
      user = await this.prisma.users.create({
        data: {
          googleId,
          email,
          username: displayName,
          profile: avatar ? { create: { avatar } } : undefined,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isBanned: true,
          banEndAt: true,
        },
      });
    }

    if (user.isBanned) {
      throw new ForbiddenException(`Account is banned`);
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email!,
      role: user.role,
    });

    await Promise.all([
      this.prisma.users.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.redisService.storeSession(user.id, tokens.refreshToken),
    ]);

    return sendResponse('Authenticated', 200, tokens);
  }

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ??
          '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ??
          '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
