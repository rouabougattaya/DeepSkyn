import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async getSubscription(userId: string): Promise<Subscription> {
    let subscription = await this.subscriptionRepo.findOne({
      where: { userId },
    });

    if (!subscription) {
      // ✅ CRITICAL: Force FREE plan for any new or unidentified user
      subscription = this.subscriptionRepo.create({
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        imagesUsed: 0,
        messagesUsed: 0,
      });
      console.log(`[Subscription] 🛡️ Created default FREE plan for user ${userId}`);
      subscription = await this.subscriptionRepo.save(subscription);
    } else if (!subscription.plan) {
      // ✅ Réparation si jamais le plan est vide
      subscription.plan = 'FREE';
      await this.subscriptionRepo.save(subscription);
    }

    return subscription;
  }

  async checkChatLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const sub = await this.getSubscription(userId);
    const limits: Record<string, number> = { FREE: 20, PRO: 200, PREMIUM: 999999 };
    const limit = limits[sub.plan] || 20;

    // Reset daily if it's a new day
    const now = new Date();
    const wasToday = sub.lastMessageAt && 
      sub.lastMessageAt.toDateString() === now.toDateString();

    if (!wasToday) {
      sub.messagesUsed = 0;
      await this.subscriptionRepo.save(sub);
    }

    const remaining = Math.max(0, limit - sub.messagesUsed);
    return { allowed: sub.messagesUsed < limit, remaining, limit };
  }

  async checkAnalysisLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const sub = await this.getSubscription(userId);
    const limits: Record<string, number> = { FREE: 5, PRO: 50, PREMIUM: 999999 };
    const limit = limits[sub.plan] || 5;

    // Reset monthly if it's a new month
    const now = new Date();
    const wasThisMonth = sub.lastImageAt && 
      sub.lastImageAt.getMonth() === now.getMonth() &&
      sub.lastImageAt.getFullYear() === now.getFullYear();

    if (!wasThisMonth && sub.imagesUsed > 0) {
      sub.imagesUsed = 0;
      await this.subscriptionRepo.save(sub);
    }

    const remaining = Math.max(0, limit - sub.imagesUsed);
    return { allowed: sub.imagesUsed < limit, remaining, limit };
  }

  async incrementMessages(userId: string): Promise<void> {
    const sub = await this.getSubscription(userId);
    sub.messagesUsed += 1;
    sub.lastMessageAt = new Date();
    await this.subscriptionRepo.save(sub);
  }

  async incrementImages(userId: string): Promise<void> {
    const sub = await this.getSubscription(userId);
    sub.imagesUsed += 1;
    sub.lastImageAt = new Date();
    await this.subscriptionRepo.save(sub);
  }

  async getUsageSummary(userId: string) {
    const chat = await this.checkChatLimit(userId);
    const analysis = await this.checkAnalysisLimit(userId);
    const sub = await this.getSubscription(userId);

    return {
      plan: sub.plan,
      chat: {
        used: sub.messagesUsed,
        limit: chat.limit,
        remaining: chat.remaining
      },
      analysis: {
        used: sub.imagesUsed,
        limit: analysis.limit,
        remaining: analysis.remaining
      }
    };
  }
}
