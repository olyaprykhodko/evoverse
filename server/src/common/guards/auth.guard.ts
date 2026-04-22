import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const header: string | undefined = request.headers['authorization'];
    if (!header?.startsWith('Basic ')) {
      throw new UnauthorizedException(
        'Authorization header with Basic credentials is required',
      );
    }

    const base64 = header.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      throw new UnauthorizedException('Invalid Basic auth format');
    }

    const email = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    request.user = await this.usersService.validateCredentials(email, password);
    return true;
  }
}
