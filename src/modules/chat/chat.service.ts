import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../redis/redis.service.js';

import {
  type ChatAuthor,
  type ChatMessageView,
} from './entities/chat.entity.js';
import {
  GLOBAL_ROOM,
  roomKey,
  HISTORY_LIMIT,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_SEC,
} from './constants/chat.constants.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async resolveAuthor(userId: number): Promise<ChatAuthor> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { username: true, profile: { select: { avatar: true } } },
    });

    return {
      id: userId,
      username: user?.username ?? null,
      avatar: user?.profile?.avatar ?? null,
    };
  }

  async getHistory(room = GLOBAL_ROOM): Promise<ChatMessageView[]> {
    const raw = await this.redis.getClient().lrange(roomKey(room), 0, -1);
    return raw
      .map((entry) => this.parse(entry))
      .filter((m): m is ChatMessageView => m !== null);
  }

  async saveMessage(
    author: ChatAuthor,
    content: string,
    room = GLOBAL_ROOM,
  ): Promise<ChatMessageView> {
    const message: ChatMessageView = {
      id: randomUUID(),
      room,
      content,
      createdAt: new Date().toISOString(),
      user: author,
    };

    const client = this.redis.getClient();
    const key = roomKey(room);
    await client.rpush(key, JSON.stringify(message));
    await client.ltrim(key, -HISTORY_LIMIT, -1);

    return message;
  }

  async withinRateLimit(userId: number): Promise<boolean> {
    const client = this.redis.getClient();
    const key = `chat:rl:${userId}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, RATE_LIMIT_WINDOW_SEC);
    return count <= RATE_LIMIT_MAX;
  }

  private parse(entry: string): ChatMessageView | null {
    try {
      return JSON.parse(entry) as ChatMessageView;
    } catch {
      return null;
    }
  }
}
