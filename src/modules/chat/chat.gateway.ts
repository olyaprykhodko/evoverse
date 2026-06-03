import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { WsJwtGuard } from '../../guards/ws-jwt.guard.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';
import { ChatService, GLOBAL_ROOM } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)['token'] ??
        client.handshake.headers['authorization']?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? '',
      });
      client.data['user'] = payload;

      await client.join(GLOBAL_ROOM);

      const history = await this.chatService.getHistory(GLOBAL_ROOM);
      client.emit('chat:history', history);

      await this.broadcastPresence();
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(): Promise<void> {
    await this.broadcastPresence();
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:send')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): Promise<void> {
    const user = client.data['user'] as JwtPayload;

    const allowed = await this.chatService.withinRateLimit(user.sub);
    if (!allowed) {
      throw new WsException('You are sending messages too fast — slow down.');
    }

    const message = await this.chatService.saveMessage(user.sub, dto.content);
    this.server.to(GLOBAL_ROOM).emit('chat:message', message);
  }

  private async broadcastPresence(): Promise<void> {
    const sockets = await this.server.in(GLOBAL_ROOM).fetchSockets();
    const online = new Set(
      sockets
        .map((s) => (s.data['user'] as JwtPayload | undefined)?.sub)
        .filter((id): id is number => typeof id === 'number'),
    ).size;
    this.server.to(GLOBAL_ROOM).emit('chat:presence', { online });
  }
}
