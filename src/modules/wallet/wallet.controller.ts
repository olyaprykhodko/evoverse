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
import { ConvertCoinsDto } from './dto/convert-coins.dto.js';

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@UseGuards(JwtAccessGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me') // get current user's wallet
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

  @Get('transactions') // get transactions history for current user
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

  @Get('coins') // get balance of glow coins
  @ApiOperation({
    summary: 'Get coin balance',
    description: 'Returns current in-game coin balance.',
  })
  @ApiResponse({ status: 200, description: 'Coin balance fetched.' })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  getCoinBalance(@Req() req: Request) {
    const user = req.user as { sub: number };
    return this.walletService.getCoinBalance(user.sub);
  }

  @Get('coins/transactions') // get coins transactions history for current user
  @ApiOperation({
    summary: 'Coin transaction history',
    description: 'Returns coin transaction history ordered newest-first.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max records to return (1–100). Default: 20.',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Coin transactions fetched.' })
  getCoinTransactions(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as { sub: number };
    const parsedLimit = parseInt(limit ?? '20', 10) || 20;
    return this.walletService.getCoinTransactions(user.sub, parsedLimit);
  }

  @Post('coins/convert') // exchange coins to USD
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cash out Glow Coins to USD balance',
    description: 'Rate: 100 Glow Coins = $1 USD. Minimum 100 GC.',
  })
  @ApiResponse({ status: 200, description: 'Cashed out.' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient coins or below minimum.',
  })
  convertCoins(@Req() req: Request, @Body() dto: ConvertCoinsDto) {
    const user = req.user as { sub: number };
    return this.walletService.convertCoinsToBalance(user.sub, dto);
  }

  @Post('coins/buy') // buy in-game coins
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buy Glow Coins with USD balance',
    description: 'Rate: $1 USD = 100 Glow Coins.',
  })
  @ApiResponse({ status: 200, description: 'Glow Coins purchased.' })
  @ApiResponse({ status: 400, description: 'Insufficient USD balance.' })
  buyCoins(@Req() req: Request, @Body() body: { usdAmount: number }) {
    const user = req.user as { sub: number };
    return this.walletService.buyGlowCoins(user.sub, body.usdAmount);
  }
}
