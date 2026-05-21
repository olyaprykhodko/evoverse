import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload } from '../strategies/jwt-access.strategy.js';

@Injectable()
export class AdminGuard extends AuthGuard('jwt-access') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<T extends JwtPayload>(err: Error, user: T): T {
    if (err || !user) throw err ?? new UnauthorizedException();
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Admin access required');
    return user;
  }
}
