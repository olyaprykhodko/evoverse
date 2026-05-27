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
  ApiUnauthorizedResponse,
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

  @Get('history') // get history of bets (authenticated account)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get own bet history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(JwtAccessGuard)
  history(
    @Req() req: Request,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const user = req.user as JwtPayload;
    return this.rouletteService.getHistory(user.sub, limit);
  }

  @Post('verify') // verify bet result
  @ApiOperation({ summary: 'Verify a bet result (public)' })
  @ApiOkResponse({ description: 'OK' })
  verify(@Body() dto: VerifyGameDto) {
    return this.rouletteService.verifyResult(dto);
  }

  @Get('tables') // get all roulette tables
  @ApiOperation({ summary: 'List all roulette tables' })
  @ApiOkResponse({ description: 'OK – list of active tables' })
  tables() {
    return this.rouletteService.getTables();
  }

  @Get('table') // join certain roulette table
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get or create a roulette table' })
  @ApiQuery({ name: 'tableId', required: false, example: 'table-1' })
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(JwtAccessGuard)
  table(@Query('tableId') tableId = 'table-1') {
    return this.rouletteService.getRoomState(tableId);
  }

  @Get('table/bets') // get bets at a certain table
  @ApiOperation({ summary: 'Get current bets at a table' })
  @ApiQuery({ name: 'tableId', required: false, example: 'table-1' })
  @ApiOkResponse({ description: 'OK' })
  tableBets(@Query('tableId') tableId = 'table-1') {
    return this.rouletteService.getTableBets(tableId);
  }

  @Post('table/bet') // place bet
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Place a bet at a table' })
  @ApiOkResponse({ description: 'OK – bet accepted' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseGuards(JwtAccessGuard)
  tableBet(@Req() req: Request, @Body() dto: PlaceRoomBetDto) {
    const user = req.user as JwtPayload;
    return this.rouletteService.placeRoomBet(user.sub, dto);
  }
}
