export interface PaymentConfirmedEvent {
  provider: 'stripe' | 'paypal';
  userId: number;
  amount: number;
  paymentId: string;
  description: string;
}
