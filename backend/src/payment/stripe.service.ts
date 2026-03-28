import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY') || 'sk_test_placeholder', {
      apiVersion: '2026-03-25.dahlia' as any,
    });
  }

  async createCheckoutSession(userId: string, plan: string, amount: number) {
    const baseUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `DeepSkyn ${plan} Subscription`,
              description: `Upgrade to ${plan} plan for enhanced skincare features.`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      metadata: {
        userId,
        plan,
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  async constructEvent(body: any, signature: string) {
    return this.stripe.webhooks.constructEvent(
      body, 
      signature, 
      this.configService.get('STRIPE_WEBHOOK_SECRET') || ''
    );
  }

  async retrieveSession(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
