import { Module } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from './stripe.service.js';
import { StripeController } from './stripe.controller.js';
import { STRIPE_CLIENT } from './constants/client.js';

@Module({
  controllers: [StripeController],
  providers: [
    StripeService,
    {
      provide: STRIPE_CLIENT,
      useFactory: (): Stripe => {
        return new Stripe(process.env.STRIPE_API_KEY ?? '', {
          apiVersion: '2026-04-22.dahlia',
        });
      },
    },
  ],
  exports: [StripeService],
})
export class StripeModule {}
