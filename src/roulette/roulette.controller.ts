import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { RouletteService } from './roulette.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { PlaceBetDto } from './dto/place-bet.dto.js';
import { VerifyGameDto } from './dto/verify-game.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { JwtPayload } from '../auth/strategies/jwt-access.strategy.js';

@Controller('roulette')
export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  @UseGuards(JwtAccessGuard)
  @Post('join')
  join(@Req() req: Request, @Body() dto: CreateSessionDto) {
    const user = req.user as JwtPayload;
    return this.rouletteService.createSession(user.sub, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Post('bet')
  bet(@Req() req: Request, @Body() dto: PlaceBetDto) {
    const user = req.user as JwtPayload;
    return this.rouletteService.placeBet(user.sub, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Delete('leave/:sessionId')
  leave(@Req() req: Request, @Param('sessionId') sessionId: string) {
    const user = req.user as JwtPayload;
    return this.rouletteService.leaveGame(user.sub, sessionId);
  }

  @UseGuards(JwtAccessGuard)
  @Get('history')
  history(
    @Req() req: Request,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const user = req.user as JwtPayload;
    return this.rouletteService.getHistory(user.sub, limit);
  }

  @Post('verify')
  verify(@Body() dto: VerifyGameDto) {
    return this.rouletteService.verifyResult(dto);
  }
}
