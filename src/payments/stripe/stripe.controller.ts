import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service.js';
import { PaymentDto } from './dto/payment.dto.js';
import Stripe from 'stripe';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({
    summary: 'Create Stripe PaymentIntent',
    description:
      'Initiates a payment flow. Returns a client_secret to confirm payment on the frontend.',
  })
  @ApiResponse({ status: 201, description: 'PaymentIntent created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createPaymentIntent(
    @Req() req: Request,
    @Body() dto: PaymentDto,
  ): Promise<{
    data: {
      id: string;
      client_secret: string;
      amount: number;
      currency: string;
      status: Stripe.PaymentIntent.Status;
    };
  }> {
    const user = req.user as { sub: string };
    const intent = await this.stripeService.createPaymentIntent(user.sub, dto);
    return {
      data: {
        id: intent.id,
        client_secret: intent.client_secret!,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status,
      },
    };
  }
}
