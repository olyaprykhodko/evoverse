import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';

export const GLOBAL_ROOM = 'global';

const HISTORY_LIMIT = 50;
const RATE_LIMIT_WINDOW_SEC = 5;
const RATE_LIMIT_MAX = 5;

export interface ChatMessageView {
  id: string;
  room: string;
  content: string;
  createdAt: Date;
  user: {
    id: number;
    username: string | null;
    avatar: string | null;
  };
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHistory(room = GLOBAL_ROOM): Promise<ChatMessageView[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { room },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    });

    return rows.reverse().map((m) => this.toView(m));
  }

  async saveMessage(
    userId: number,
    content: string,
    room = GLOBAL_ROOM,
  ): Promise<ChatMessageView> {
    const created = await this.prisma.chatMessage.create({
      data: { userId, room, content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatar: true } },
          },
        },
      },
    });

    return this.toView(created);
  }

  async withinRateLimit(userId: number): Promise<boolean> {
    const client = this.redis.getClient();
    const key = `chat:rl:${userId}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, RATE_LIMIT_WINDOW_SEC);
    return count <= RATE_LIMIT_MAX;
  }

  private toView(row: {
    id: string;
    room: string;
    content: string;
    createdAt: Date;
    user: {
      id: number;
      username: string | null;
      profile: { avatar: string | null } | null;
    };
  }): ChatMessageView {
    return {
      id: row.id,
      room: row.room,
      content: row.content,
      createdAt: row.createdAt,
      user: {
        id: row.user.id,
        username: row.user.username,
        avatar: row.user.profile?.avatar ?? null,
      },
    };
  }
}
