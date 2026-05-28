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
import { BattleService } from './battle.service.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';

@WebSocketGateway({ namespace: '/battle', cors: { origin: '*' } })
export class BattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly battleService: BattleService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket): void {
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
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data['user'] as JwtPayload | undefined;
    if (!user) return;

    const battleId = await this.battleService.handleDisconnect(user.sub);
    if (battleId) {
      client.to(battleId).emit('battle:opponent-disconnected', { battleId });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('queue:join')
  async onQueueJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinQueueDto,
  ) {
    const user = client.data['user'] as JwtPayload;

    try {
      const match = await this.battleService.joinQueue(
        user.sub,
        client.id,
        dto.weaponId,
      );
      client.emit('queue:joined', { weaponId: dto.weaponId });

      if (match) {
        const [p1Remote] = await this.server
          .in(match.p1.socketId)
          .fetchSockets();
        const [p2Remote] = await this.server
          .in(match.p2.socketId)
          .fetchSockets();

        if (p1Remote) {
          p1Remote.data['battleId'] = match.battleId;
          await p1Remote.join(match.battleId);
          p1Remote.emit('battle:matched', match.p1.payload);
        }
        if (p2Remote) {
          p2Remote.data['battleId'] = match.battleId;
          await p2Remote.join(match.battleId);
          p2Remote.emit('battle:matched', match.p2.payload);
        }
      }
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('queue:leave')
  async onQueueLeave(@ConnectedSocket() client: Socket) {
    const user = client.data['user'] as JwtPayload;
    await this.battleService.removeFromQueue(user.sub);
    client.emit('queue:left', {});
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('battle:attack')
  async onAttack(@ConnectedSocket() client: Socket) {
    const user = client.data['user'] as JwtPayload;
    const battleId = client.data['battleId'] as string | undefined;

    if (!battleId) throw new WsException('Not in a battle');

    try {
      const result = await this.battleService.processAttack(user.sub, battleId);

      this.server.to(battleId).emit('battle:round-result', {
        round: result.roundResult.round,
        attackerId: result.roundResult.attackerId,
        damage: result.roundResult.damage,
        hp1: result.roundResult.hp1After,
        hp2: result.roundResult.hp2After,
        nextTurnUserId: result.finished ? null : result.nextTurnUserId,
      });

      if (result.finished) {
        this.server.to(battleId).emit('battle:finished', {
          winnerId: result.winnerId,
        });
      }
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }
}
