import {
  Controller,
  Get,
  Post,
  Body,
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
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RouletteService } from './roulette.service.js';
import { PlaceRoomBetDto } from './dto/place-room-bet.dto.js';
import { VerifyGameDto } from './dto/verify-game.dto.js';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';

@ApiTags('Roulette')
@Controller('roulette')
export class RouletteController {
  constructor(private readonly rouletteService: RouletteService) {}

  @Get('history') // get history
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
  history(
    @Req() req: Request,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const user = req.user as JwtPayload;
    return this.rouletteService.getHistory(user.sub, limit);
  }

  @Post('verify') // verify result
  @ApiOperation({
    summary: 'Verify a bet result (public)',
    description:
      'Recomputes HMAC-SHA256 from revealed serverSeed + clientSeed + nonce to confirm the result was not tampered with',
  })
  @ApiOkResponse({ description: 'OK – winningNumber and hmacProof' })
  verify(@Body() dto: VerifyGameDto) {
    return this.rouletteService.verifyResult(dto);
  }

  @Get('table') // create and/or join roulette table
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get or create the current roulette table',
    description:
      'Returns the active multiplayer table. If no table exists, creates one with a 60-second betting window. The serverSeed is hidden until spin — only serverHash is returned as a provably-fair commitment.',
  })
  @ApiOkResponse({
    description: 'OK – table state (id, serverHash, phase, expiresIn)',
  })
  @ApiCreatedResponse({ description: 'Created – new table opened' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(JwtAccessGuard)
  table() {
    return this.rouletteService.getRoomState();
  }

  @Post('table/bet') // place a bet
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Place a bet at the current table',
    description:
      'Adds your bet to the active table. Multiple players can bet in parallel. Your clientSeed is stored for post-round provably-fair verification but does not affect the winning number.',
  })
  @ApiOkResponse({ description: 'OK – bet accepted (tableId, expiresIn)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({
    description: 'Not Found – no active table or wallet missing',
  })
  @UseGuards(JwtAccessGuard)
  tableBet(@Req() req: Request, @Body() dto: PlaceRoomBetDto) {
    const user = req.user as JwtPayload;
    return this.rouletteService.placeRoomBet(user.sub, dto);
  }
}
