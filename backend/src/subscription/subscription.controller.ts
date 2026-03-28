import { Controller, Get, Param } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status/:userId')
  async getUsageStatus(@Param('userId') userId: string) {
    return this.subscriptionService.getUsageSummary(userId);
  }

  @Get(':userId')
  async getSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }
}
