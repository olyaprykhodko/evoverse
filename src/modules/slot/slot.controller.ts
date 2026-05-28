import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SlotService } from './slot.service.js';
import { SpinDto } from './dto/spin.dto.js';
import { VerifySpinDto } from './dto/verify-spin.dto.js';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import type { JwtPayload } from '../../strategies/jwt-access.strategy.js';

@ApiTags('Slot')
@ApiBearerAuth('JWT')
@UseGuards(JwtAccessGuard)
@Controller('slot')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  @Get('session') // join slot
  @ApiOperation({
    summary: 'Get or create slot session',
    description:
      'Returns the pre-committed serverHash and current nonce. ' +
      'Call this before spinning to receive the server commitment.',
  })
  @ApiOkResponse({ description: 'Session fetched or created' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getSession(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.slotService.getSession(user.sub);
  }

  @Post('spin') // spin slot
  @ApiOperation({
    summary: 'Spin the slot',
    description:
      'Deducts bet in GC, computes result via HMAC(serverSeed, clientSeed:nonce), ' +
      'credits payout if won, rotates seed. Returns revealed serverSeed for verification.',
  })
  @ApiOkResponse({ description: 'Spin result with provably fair data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  spin(@Req() req: Request, @Body() dto: SpinDto) {
    const user = req.user as JwtPayload;
    return this.slotService.spin(user.sub, dto);
  }

  @Get('history') // get history of bets and spins
  @ApiOperation({ summary: 'Get own spin history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Spin history fetched' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  history(
    @Req() req: Request,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const user = req.user as JwtPayload;
    return this.slotService.getHistory(user.sub, limit);
  }

  @Post('verify') // verify result
  @ApiOperation({
    summary: 'Verify a past spin result (public)',
    description:
      'Recomputes stops from serverSeed + clientSeed + nonce. ' +
      'Anyone can verify any spin without authentication.',
  })
  @ApiOkResponse({ description: 'Verification result' })
  verify(@Body() dto: VerifySpinDto) {
    return this.slotService.verifyResult(dto);
  }
}
