import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Subscription } from '../subscription/subscription.entity';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Subscription])],
  providers: [PaymentService, StripeService],
  controllers: [PaymentController],
  exports: [PaymentService, StripeService],
})
export class PaymentModule {}
