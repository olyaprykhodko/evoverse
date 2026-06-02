import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { JwtRefreshGuard } from '../../guards/jwt-refresh.guard.js';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';
import { GoogleAuthGuard } from '../../guards/google.guard.js';
import { GoogleProfile } from '../../common/types/google.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google') // google oauth
  @ApiOperation({ summary: 'Authentication via Google OAuth' })
  @UseGuards(GoogleAuthGuard)
  googleAuth() {}

  @Get('google/callback') // google oauth callback
  @ApiOperation({ summary: 'Google OAuth callback' })
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const response = await this.authService.validateGoogleUser(
      req.user as GoogleProfile,
    );

    const url = new URL(process.env.FRONTEND_OAUTH_REDIRECT!);
    url.searchParams.set('accessToken', response.data!.accessToken);
    url.searchParams.set('refreshToken', response.data!.refreshToken);
    return res.redirect(url.toString());
  }

  @Post('login') // login
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'OK – returns access and refresh tokens' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized – invalid credentials or banned account',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh') // refresh token
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
  refresh(@Req() req: Request, @Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(req.user as JwtPayload, refreshToken);
  }

  @Post('logout') // invalidate session
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout (invalidate session)' })
  @ApiOkResponse({ description: 'OK – logout successful' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized – missing or invalid token',
  })
  @UseGuards(JwtAccessGuard)
  logout(@Req() req: Request) {
    return this.authService.logout((req.user as JwtPayload).sub);
  }
}
