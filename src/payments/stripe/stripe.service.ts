import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { STRIPE_CLIENT } from './constants/client.js';
import { PaymentDto } from './dto/payment.dto.js';
import Stripe from 'stripe';

export interface PaymentConfirmedEvent {
  provider: 'stripe';
  userId: number;
  amount: number;
  paymentId: string;
  description: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(@Inject(STRIPE_CLIENT) private readonly stripe: Stripe) {}

  async createPaymentIntent(
    userId: string,
    dto: PaymentDto,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: dto.amount,
        currency: dto.currency,
        metadata: { userId: String(userId) },
      });
      this.logger.log(`PaymentIntent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error: unknown) {
      this.logger.error('Failed to create PaymentIntent', error);
      throw new InternalServerErrorException('Could not create PaymentIntent');
    }
  }

  verifyAndParseWebhook(
    rawBody: Buffer,
    signature: string,
  ): PaymentConfirmedEvent | null {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new InternalServerErrorException('Webhook not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Webhook signature verification failed: ${msg}`);
      throw new BadRequestException(`Webhook signature invalid: ${msg}`);
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    if (event.type !== 'payment_intent.succeeded') return null;

    const pi = event.data.object;
    const userIdStr = pi.metadata['userId'];

    if (!userIdStr) {
      this.logger.error(`PaymentIntent ${pi.id} has no userId in metadata`);
      return null;
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      this.logger.error(`Invalid userId in Stripe metadata: ${userIdStr}`);
      return null;
    }

    return {
      provider: 'stripe',
      userId,
      amount: pi.amount,
      paymentId: pi.id,
      description: 'Stripe deposit',
    };
  }
}
