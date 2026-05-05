import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { JwtAccessGuard } from './guards/jwt-access.guard.js';
import type { JwtPayload } from './strategies/jwt-access.strategy.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'OK – returns access and refresh tokens' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized – invalid credentials or banned account',
  })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Send `refreshToken` as a body field (not a Bearer header)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
      },
    },
  })
  @ApiOkResponse({ description: 'OK – returns new access and refresh tokens' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized – invalid or expired refresh token',
  })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: Request) {
    return this.authService.refresh(req.user as JwtPayload);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout (stateless – invalidate client-side)' })
  @ApiOkResponse({ description: 'OK – logout successful' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized – missing or invalid token',
  })
  @UseGuards(JwtAccessGuard)
  @Post('logout')
  logout() {
    return this.authService.logout();
  }
}
