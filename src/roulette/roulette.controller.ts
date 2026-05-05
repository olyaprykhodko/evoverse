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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RouletteService } from './roulette.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { PlaceBetDto } from './dto/place-bet.dto.js';
import { VerifyGameDto } from './dto/verify-game.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import type { JwtPayload } from '../auth/strategies/jwt-access.strategy.js';

@ApiTags('Roulette')
@Controller('roulette')
export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Start a new roulette game session' })
  @ApiCreatedResponse({
    description: 'Created – returns sessionId and serverHash',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(JwtAccessGuard)
  @Post('join')
  join(@Req() req: Request, @Body() dto: CreateSessionDto) {
    const user = req.user as JwtPayload;
    return this.rouletteService.createSession(user.sub, dto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Place a bet in an open session' })
  @ApiOkResponse({
    description: 'OK – bet result with winning number and payout',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden – session belongs to another user',
  })
  @ApiNotFoundResponse({
    description: 'Not Found – session or profile not found',
  })
  @UseGuards(JwtAccessGuard)
  @Post('bet')
  bet(@Req() req: Request, @Body() dto: PlaceBetDto) {
    const user = req.user as JwtPayload;
    return this.rouletteService.placeBet(user.sub, dto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Leave the game session',
    description:
      'Closes the session and reveals the serverSeed for provably-fair verification',
  })
  @ApiOkResponse({ description: 'OK – returns revealed serverSeed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden – session belongs to another user',
  })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @UseGuards(JwtAccessGuard)
  @Delete('leave/:sessionId')
  leave(@Req() req: Request, @Param('sessionId') sessionId: string) {
    const user = req.user as JwtPayload;
    return this.rouletteService.leaveGame(user.sub, sessionId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get own bet history' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Max 100',
  })
  @ApiOkResponse({ description: 'OK – list of bets with session info' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(JwtAccessGuard)
  @Get('history')
  history(
    @Req() req: Request,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const user = req.user as JwtPayload;
    return this.rouletteService.getHistory(user.sub, limit);
  }

  @ApiOperation({
    summary: 'Verify a bet result (public)',
    description:
      'Recomputes HMAC-SHA256 from revealed serverSeed + clientSeed + nonce to confirm the result was not tampered with',
  })
  @ApiOkResponse({ description: 'OK – winningNumber and hmacProof' })
  @Post('verify')
  verify(@Body() dto: VerifyGameDto) {
    return this.rouletteService.verifyResult(dto);
  }
}
