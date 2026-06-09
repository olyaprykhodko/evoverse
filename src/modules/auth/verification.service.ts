import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { sendResponse } from '../../common/utils/response.js';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  async createAndSend(userId: number, email: string): Promise<void> {
    const raw = crypto.randomBytes(32).toString('hex');
    await this.redis.storeEmailVerifyToken(userId, raw);
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${raw}`;
    await this.mail.sendVerificationEmail(email, link);
  }

  async verify(token: string) {
    const userId = await this.redis.consumeEmailVerifyToken(token);
    if (!userId) throw new BadRequestException('Invalid or expired token');
    await this.prisma.users.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    return sendResponse('Email verified', 200);
  }

  async resend(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email, isDeleted: false },
      select: { id: true, email: true, emailVerified: true },
    });
    if (user && !user.emailVerified) {
      await this.createAndSend(user.id, user.email!);
    }
    return sendResponse('Link sent', 200);
  }
}
