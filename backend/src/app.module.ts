import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailSecurityModule } from './email-security/email-security.module';
import { UsersModule } from './user/users.module';
import { ModerationModule } from './moderation/moderation.module';
import { AnalysisController } from './analysis.controller';
import { MetricsModule } from './metrics/metrics.module';
import { AiModule } from './ai/ai.module';
import { SessionModule } from './sessions/session.module'; // ← AJOUTE CET IMPORT
import { InsightsModule } from './insights/insights.module';
import { SkinMetricModule } from './skinMetric/skin-metric.module';
import { AdminModule } from './admin/admin.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { RoutineModule } from './routine/routine.module';
import { ProductsModule } from './products/products.module';
import { ChatModule } from './chat/chat.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import { PlansModule } from './plans/plans.module';
import { DigitalTwinModule } from './digitalTwin/digital-twin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 100 },
    ]),
    EmailSecurityModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || process.env.DB_DATABASE || 'deepskyn_db',
        }),
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UsersModule,
    ModerationModule,
    MetricsModule,
    AiModule,
    SkinMetricModule,
    SessionModule, // ← AJOUTE CETTE LIGNE (ne touche pas aux autres)
    InsightsModule,
    AdminModule,
    RecommendationModule,
    RoutineModule,
    ProductsModule,
    ChatModule,
    SubscriptionModule,
    PaymentModule,
    PlansModule,
    DigitalTwinModule,
  ],
  controllers: [AppController, AnalysisController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
