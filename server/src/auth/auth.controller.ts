import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignupDto } from '../users/dto/signup.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import type { UserRecord } from '../common/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async register(@Body() userData: SignupDto) {
    return this.usersService.create(userData);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  login(@AuthUser() user: UserRecord) {
    return this.usersService.findById(user.id);
  }

  @Post('logout')
  @HttpCode(200)
  logout() {
    return { message: 'Logged out' };
  }
}
