import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessGuard } from '../../guards/jwt-access.guard.js';
import { WalletService } from './wallet.service.js';
import { DepositDto } from './dto/deposit.dto.js';

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@UseGuards(JwtAccessGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get my wallet',
    description:
      'Returns current balance and the 10 most recent transactions for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Wallet fetched.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — Bearer token required.',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  getWallet(@Req() req: Request) {
    const user = req.user as { sub: number };
    return this.walletService.getWallet(user.sub);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Manual top-up',
    description: 'Credits the wallet with the given amount. ',
  })
  @ApiResponse({ status: 201, description: 'Deposit successful.' })
  @ApiResponse({
    status: 200,
    description: 'Already processed — idempotent response.',
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — Bearer token required.',
  })
  deposit(@Req() req: Request, @Body() dto: DepositDto) {
    const user = req.user as { sub: number };
    return this.walletService.deposit(user.sub, dto);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Transaction history',
    description: 'Returns up to 100 wallet transactions ordered newest-first.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max records to return (1–100). Default: 20.',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Transaction history fetched.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — Bearer token required.',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  getTransactions(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as { sub: number };
    const parsedLimit = parseInt(limit ?? '20', 10) || 20;
    return this.walletService.getTransactionHistory(user.sub, parsedLimit);
  }
}
