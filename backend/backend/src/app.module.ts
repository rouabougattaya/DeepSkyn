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
import { ScoringService } from './scoring.service';
import { SkinAnalysis } from './skinAnalysis/skin-analysis.entity';
import { SkinMetric } from './skinMetric/skin-metric.entity';
import { SkinMetricService } from './skinMetric/skin-metric.service';
import { TypeOrmModule as AnalysisTypeOrmModule } from '@nestjs/typeorm';
import { MetricsModule } from './metrics/metrics.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
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
          password: process.env.DB_PASSWORD || 'asia2015',
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
    AnalysisTypeOrmModule.forFeature([SkinAnalysis, SkinMetric]),
  ],
  controllers: [AppController, AnalysisController],
  providers: [
    AppService,
    ScoringService,
    SkinMetricService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
