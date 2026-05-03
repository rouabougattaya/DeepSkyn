import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Subscription } from '../subscription/subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';

const PLAN_PRICES: Record<'PRO' | 'PREMIUM', number> = {
  PRO: 9.99,
  PREMIUM: 19.99,
};

const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  PREMIUM: 2,
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  /**
   * POST /payments/subscribe
   * Upgrades a user's plan (FREE → PRO, FREE/PRO → PREMIUM)
   */
  async subscribe(dto: SubscribeDto): Promise<{ subscription: Subscription; payment: Payment }> {
    // 1. Find or create subscription
    let subscription = await this.subscriptionRepo.findOne({ where: { userId: dto.userId } });

    if (!subscription) {
      subscription = this.subscriptionRepo.create({
        userId: dto.userId,
        plan: 'FREE',
        status: 'ACTIVE',
        imagesUsed: 0,
        messagesUsed: 0,
      });
      await this.subscriptionRepo.save(subscription);
    }

    // 2. Create payment record first
    const amount = PLAN_PRICES[dto.plan];
    const payment = this.paymentRepo.create({
      userId: dto.userId,
      subscriptionId: subscription.id,
      amount,
      currency: 'USD',
      status: 'PAID',
      konnectTransactionId: `sim_${Date.now()}`,
    });
    await this.paymentRepo.save(payment);

    // 3. Validate upgrade direction
    const currentLevel = PLAN_HIERARCHY[subscription.plan] ?? 0;
    const targetLevel = PLAN_HIERARCHY[dto.plan] ?? 0;

    if (targetLevel <= currentLevel) {
      // If user is already at or above the target level, just confirm success
      return { 
        subscription, 
        payment
      };
    }

    // 5. Upgrade subscription
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    subscription.plan = dto.plan;
    subscription.status = 'ACTIVE';
    subscription.startDate = now;
    subscription.endDate = endDate;

    await this.subscriptionRepo.save(subscription);

    return { subscription, payment };
  }

  /**
   * GET /payments/history/:userId
   * Returns all payment records for a user
   */
  async getHistory(userId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
