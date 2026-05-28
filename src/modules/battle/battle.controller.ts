import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import { BattleService } from './battle.service.js';

@ApiTags('Battle')
@ApiBearerAuth('JWT')
@UseGuards(JwtAccessGuard)
@Controller('battle')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Get('history') // get list of recent battles
  @ApiOperation({
    summary: 'Battle history',
    description: 'Returns last 50 battles for the current user.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Battle history fetched.' })
  getHistory(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as { sub: number };
    const parsedLimit = parseInt(limit ?? '20', 10) || 20;
    return this.battleService.getHistory(user.sub, parsedLimit);
  }

  @Get('stats') // get battles stats for current user
  @ApiOperation({
    summary: 'Battle stats',
    description: 'Returns win/loss/streak stats for the current user.',
  })
  @ApiResponse({ status: 200, description: 'Stats fetched.' })
  getStats(@Req() req: Request) {
    const user = req.user as { sub: number };
    return this.battleService.getBattleStats(user.sub);
  }
}
