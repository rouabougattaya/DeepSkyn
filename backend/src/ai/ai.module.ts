import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { FakeAiService } from './fake-ai.service';
import { DetectionAdapterService } from './detection-adapter.service';
import { ScoringEngineService } from './scoring-engine.service';
import { AiAnalysisService } from './ai-analysis.service';
import { OpenRouterService } from './openrouter.service';
import { ImageValidationService } from './image-validation.service';
import { GeminiService } from './gemini.service';
import { RiskPredictionService } from './risk-prediction.service';
import { SvrRoutineService } from './svr-routine.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { UserProfile } from '../userProfile/user-profile.entity';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { IncompatibilityService } from '../routine/incompatibility.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkinAnalysis, SkinMetric, UserProfile]),
    RecommendationModule,
    SubscriptionModule,
  ],
  controllers: [AiController],
  providers: [
    FakeAiService,
    DetectionAdapterService,
    ScoringEngineService,
    AiAnalysisService,
    OpenRouterService,
    GeminiService,
    RiskPredictionService,
    IncompatibilityService,
    ImageValidationService,
    SvrRoutineService,
  ],
  exports: [
    FakeAiService,
    DetectionAdapterService,
    ScoringEngineService,
    AiAnalysisService,
    OpenRouterService,
    GeminiService,
    RiskPredictionService,
    ImageValidationService,
    SvrRoutineService,
  ],
})
export class AiModule { }