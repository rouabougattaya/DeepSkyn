import { Controller, Post, Get, Patch, Body, Param, Headers, Req, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Public } from '../auth/decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../subscription/subscription.entity';

const PLAN_PRICES: Record<string, number> = {
  PRO: 20,
  PREMIUM: 50,
};

const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  PREMIUM: 2,
};

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  /**
   * POST /api/payments/subscribe
   * Upgrades a user plan: FREE → PRO | PRO → PREMIUM
   */
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    return this.paymentService.subscribe(dto);
  }

  /**
   * GET /api/payments/history/:userId
   * Returns all payment records for a user
   */
  @Get('history/:userId')
  async getHistory(@Param('userId') userId: string) {
    return this.paymentService.getHistory(userId);
  }

  /**
   * POST /api/payments/webhook
   * Real Stripe Webhook for payment events
   */
  @Public()
  @Post('webhook')
  async handleWebhook(@Body() body: any, @Headers('stripe-signature') signature: string, @Req() req: any) {
    const event = await this.stripeService.constructEvent(req.rawBody || body, signature);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const { userId, plan } = session.metadata;
      
      console.log(`💰 Paiement réussi pour ${userId} - Plan ${plan}`);
      
      await this.paymentService.subscribe({
        userId,
        plan,
        cardHolder: 'Stripe Payment',
        cardLast4: 'XXXX',
      });
    }
    
    return { received: true };
  }

  /**
   * POST /api/payments/checkout-session
   * Real Stripe Checkout session creation
   */
  @Post('checkout-session')
  async createSession(@Body() dto: { userId: string; plan: string }) {
    const amount = PLAN_PRICES[dto.plan] || 0;
    return this.stripeService.createCheckoutSession(dto.userId, dto.plan, amount);
  }

  /**
   * GET /api/payments/session/:sessionId
   * Verify payment status after Stripe redirect
   */
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    try {
      const session = await this.stripeService.retrieveSession(sessionId);
      
      if (session.payment_status === 'paid' && session.metadata) {
        const { userId, plan } = session.metadata;
        
        // Process the payment immediately
        await this.paymentService.subscribe({
          userId,
          plan: plan as 'PRO' | 'PREMIUM',
          cardHolder: 'Stripe Payment',
          cardLast4: 'XXXX',
        });
        
        return { 
          success: true, 
          plan,
          message: 'Payment processed successfully'
        };
      }
      
      return { 
        success: false, 
        message: 'Payment not completed'
      };
    } catch (error) {
      throw new BadRequestException('Invalid session');
    }
  }

  /**
   * PATCH /api/payments/subscription/:userId
   * Downgrade user subscription
   */
  @Patch('subscription/:userId')
  async downgradeSubscription(@Param('userId') userId: string, @Body() body: { plan: string }) {
    try {
      // Find existing subscription
      const subscription = await this.subscriptionRepo.findOne({ where: { userId } });
      
      if (!subscription) {
        throw new BadRequestException('Subscription not found');
      }

      // Validate downgrade (only allow downgrade to FREE)
      const currentLevel = PLAN_HIERARCHY[subscription.plan] ?? 0;
      const targetLevel = PLAN_HIERARCHY[body.plan] ?? 0;
      
      if (targetLevel >= currentLevel) {
        throw new BadRequestException('Cannot upgrade to same or higher plan. Use upgrade endpoint instead.');
      }

      // Update subscription
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);

      subscription.plan = body.plan as 'FREE' | 'PRO' | 'PREMIUM';
      subscription.status = 'ACTIVE';
      subscription.startDate = now;
      subscription.endDate = endDate;

      await this.subscriptionRepo.save(subscription);

      return { 
        success: true, 
        plan: body.plan,
        message: `Successfully downgraded to ${body.plan}`
      };
    } catch (error) {
      throw new BadRequestException('Failed to downgrade subscription');
    }
  }
}
