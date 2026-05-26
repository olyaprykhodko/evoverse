import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { JwtPayload } from '../strategies/jwt-access.strategy.js';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();

    const token =
      (client.handshake.auth as Record<string, string>)['token'] ??
      client.handshake.headers['authorization']?.replace('Bearer ', '');

    if (!token) throw new UnauthorizedException('WS token missing');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? '',
      });
      client.data['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('WS token invalid');
    }
  }
}
