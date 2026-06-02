import {
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
import { Server, Socket } from 'socket.io';

import { WsJwtGuard } from '../../guards/ws-jwt.guard.js';
import { BattleService } from './battle.service.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';
import { MoveDto } from './dto/move.dto.js';
import type { ResolvedRound } from './entities/battle.entity.js';
import { SWEEP_INTERVAL_MS } from './constants/battle.constants.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';

@WebSocketGateway({ namespace: '/battle', cors: { origin: '*' } })
export class BattleGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BattleGateway.name);

  private sweepTimer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly battleService: BattleService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      void this.sweepDeadlines();
    }, SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  private async sweepDeadlines(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const due = await this.battleService.claimDueRounds();
      for (const { battleId, round } of due) {
        const result = await this.battleService.forceResolveRound(
          battleId,
          round,
        );
        if (result) this.broadcastRound(battleId, result);
      }
    } catch (err) {
      this.logger.error(`Deadline sweep failed: ${(err as Error).message}`);
    } finally {
      this.sweeping = false;
    }
  }

  private broadcastRound(battleId: string, result: ResolvedRound): void {
    this.server.to(battleId).emit('battle:round-result', {
      round: result.round.round,
      move1: result.round.move1,
      move2: result.round.move2,
      damageTo1: result.round.damageTo1,
      damageTo2: result.round.damageTo2,
      hp1: result.round.hp1After,
      hp2: result.round.hp2After,
      finished: result.finished,
      winnerId: result.finished ? result.winnerId : null,
      nextRound: result.finished ? null : result.nextRound,
      roundEndsAt: result.finished ? null : result.roundEndsAt,
    });

    if (result.finished) {
      this.server
        .to(battleId)
        .emit('battle:finished', { winnerId: result.winnerId });
    }
  }

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
  @SubscribeMessage('battle:move')
  async onMove(@ConnectedSocket() client: Socket, @MessageBody() dto: MoveDto) {
    const user = client.data['user'] as JwtPayload;
    const battleId = client.data['battleId'] as string | undefined;

    if (!battleId) throw new WsException('Not in a battle');

    try {
      const result = await this.battleService.submitMove(user.sub, battleId, {
        attackZone: dto.attackZone,
        defenseZone: dto.defenseZone,
      });

      if (result.status === 'waiting') {
        client.emit('battle:move-accepted', { battleId });
        return;
      }

      this.broadcastRound(battleId, result);
    } catch (err) {
      throw new WsException((err as Error).message);
    }
  }
}
