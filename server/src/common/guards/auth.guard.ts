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
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      throw new UnauthorizedException(
        'email and password are required in the request body',
      );
    }

    request.user = await this.usersService.validateCredentials(email, password);
    return true;
  }
}
