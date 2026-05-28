import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service.js';
import { PaymentsService } from '../payments.service.js';
import { PaymentDto } from './dto/payment.dto.js';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../../../guards/jwt-access.guard.js';
import type { JwtPayload } from '../../../strategies/jwt-access.strategy.js';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('checkout-session') // create checkout
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create Stripe Checkout Session' })
  @ApiResponse({ status: 201, description: 'Checkout session URL returned.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createCheckoutSession(
    @Req() req: Request,
    @Body() dto: PaymentDto,
  ): Promise<{ data: { url: string } }> {
    const user = req.user as JwtPayload;
    const result = await this.stripeService.createCheckoutSession(
      user.sub,
      dto,
    );
    return { data: result };
  }

  @Post('webhook') // webhook for stripe
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver (internal)' })
  @ApiResponse({ status: 200, description: 'Event processed.' })
  @ApiResponse({ status: 400, description: 'Invalid signature.' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    this.logger.debug(
      `Webhook received — sig: ${signature ? 'present' : 'MISSING'}, body type: ${typeof req.body}, isBuffer: ${Buffer.isBuffer(req.body)}`,
    );

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!Buffer.isBuffer(req.body)) {
      this.logger.error(
        `req.body is not a Buffer (got ${typeof req.body}) — raw body middleware may not be applied`,
      );
      throw new BadRequestException('Unexpected body format');
    }

    const event = this.stripeService.parseWebhookEvent(req.body, signature);
    if (!event) return;
    await this.paymentsService.handlePaymentConfirmed(event);
  }
}
