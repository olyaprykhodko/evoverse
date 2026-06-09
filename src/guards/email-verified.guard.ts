import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../strategies/jwt-access.strategy.js';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<Request>();
    const payload = user as JwtPayload | undefined;
    if (!payload?.sub) throw new UnauthorizedException();

    const dbUser = await this.prisma.users.findFirst({
      where: { id: payload.sub, isDeleted: false },
      select: { emailVerified: true },
    });

    if (!dbUser?.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email to perform this action',
      );
    }
    return true;
  }
}
