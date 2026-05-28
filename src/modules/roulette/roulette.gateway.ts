import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import type {
  SpinResult,
  BetPlacedEvent,
  PlayerInfo,
} from './entities/room-entities.js';

@WebSocketGateway({ namespace: '/roulette', cors: { origin: '*' } })
export class RouletteGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly tablePlayers = new Map<string, Map<string, PlayerInfo>>();

  handleDisconnect(client: Socket): void {
    for (const [tableId, players] of this.tablePlayers.entries()) {
      if (players.has(client.id)) {
        players.delete(client.id);
        this.broadcastPlayerList(tableId);
        break;
      }
    }
  }

  @SubscribeMessage('table:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { tableId: string; userId: number; username: string },
  ): void {
    for (const [tid, players] of this.tablePlayers.entries()) {
      if (players.has(client.id)) {
        players.delete(client.id);
        void client.leave(`table:${tid}`);
        this.broadcastPlayerList(tid);
        break;
      }
    }
    const { tableId, userId, username } = data;
    void client.join(`table:${tableId}`);
    if (!this.tablePlayers.has(tableId)) {
      this.tablePlayers.set(tableId, new Map());
    }
    this.tablePlayers.get(tableId)!.set(client.id, { userId, username });
    this.broadcastPlayerList(tableId);
  }

  @SubscribeMessage('table:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ): void {
    const players = this.tablePlayers.get(data.tableId);
    if (players) players.delete(client.id);
    void client.leave(`table:${data.tableId}`);
    this.broadcastPlayerList(data.tableId);
  }

  broadcastPlayerList(tableId: string): void {
    const players = this.tablePlayers.get(tableId);
    const list: PlayerInfo[] = players ? Array.from(players.values()) : [];
    this.server.to(`table:${tableId}`).emit('table:players', list);
  }

  getPlayerCount(tableId: string): number {
    return this.tablePlayers.get(tableId)?.size ?? 0;
  }

  broadcastResult(tableId: string, result: SpinResult): void {
    this.server.to(`table:${tableId}`).emit('table:result', result);
  }

  broadcastCountdown(tableId: string, expiresIn: number): void {
    this.server
      .to(`table:${tableId}`)
      .emit('table:countdown', { tableId, expiresIn });
  }

  broadcastBetPlaced(tableId: string, event: BetPlacedEvent): void {
    this.server.to(`table:${tableId}`).emit('table:bet-placed', event);
  }
}
