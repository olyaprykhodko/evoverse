import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import type { JwtPayload } from './strategies/jwt-access.strategy.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: Request) {
    return this.authService.refresh(req.user as JwtPayload);
  }

  @UseGuards(JwtAccessGuard)
  @Post('logout')
  logout() {
    return this.authService.logout();
  }
}
