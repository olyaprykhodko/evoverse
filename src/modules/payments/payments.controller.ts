import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { StripeService } from './stripe/stripe.service.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver (internal)' })
  @ApiResponse({ status: 200, description: 'Event processed.' })
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const event = this.stripeService.parseWebhookEvent(
      req.body as Buffer,
      signature,
    );

    if (!event) return;

    try {
      await this.paymentsService.handlePaymentConfirmed(event);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to process payment ${event.paymentId} for user ${event.userId}: ${msg}`,
      );
    }
  }
}
