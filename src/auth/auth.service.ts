import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { sendResponse } from '../../utils/response.js';
import type { JwtPayload } from './strategies/jwt-access.strategy.js';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    await this.prisma.users.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return sendResponse('Login successful', 200, tokens);
  }

  async refresh(payload: JwtPayload) {
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

    return sendResponse('Tokens refreshed', 200, tokens);
  }

  // REDIS BLOCKLIST FOR TOKENS
  logout() {
    return sendResponse('Logged out successfully', 200);
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
