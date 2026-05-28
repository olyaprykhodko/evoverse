import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { STRIPE_CLIENT } from './constants/client.js';
import { PaymentDto } from './dto/payment.dto.js';
import { PaymentConfirmedEvent } from '../payments.types.js';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(@Inject(STRIPE_CLIENT) private readonly stripe: Stripe) {}

  async createCheckoutSession(
    userId: number,
    dto: PaymentDto,
  ): Promise<{ url: string }> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: 'GlowVerse Deposit' },
              unit_amount: dto.amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${frontendUrl}/wallet?deposit=success`,
        cancel_url: `${frontendUrl}/wallet?deposit=cancelled`,
        metadata: { userId: String(userId) },
      });

      if (!session.url) {
        throw new InternalServerErrorException(
          'Stripe did not return a checkout URL',
        );
      }

      this.logger.log(
        `CheckoutSession created: ${session.id} for user ${userId}`,
      );
      return { url: session.url };
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Failed to create CheckoutSession', error);
      throw new InternalServerErrorException(
        'Could not create checkout session',
      );
    }
  }

  parseWebhookEvent(
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
      throw new BadRequestException(`Webhook Error: ${msg}`);
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    if (event.type !== 'checkout.session.completed') return null;

    const session = event.data.object;
    const userIdStr = session.metadata?.['userId'];

    if (!userIdStr) {
      this.logger.error(
        `checkout.session.completed ${session.id} missing userId in metadata`,
      );
      return null;
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      this.logger.error(
        `checkout.session.completed ${session.id} non-numeric userId: "${userIdStr}"`,
      );
      return null;
    }

    const amount = Math.round((session.amount_total ?? 0) / 100);
    if (amount <= 0) {
      this.logger.error(
        `checkout.session.completed ${session.id} invalid amount_total: ${session.amount_total}`,
      );
      return null;
    }

    return {
      provider: 'stripe',
      userId,
      amount,
      paymentId: session.id,
      description: 'Stripe deposit',
    };
  }
}
