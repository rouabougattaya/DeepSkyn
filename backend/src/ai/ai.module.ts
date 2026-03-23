import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { FakeAiService } from './fake-ai.service';
import { DetectionAdapterService } from './detection-adapter.service';
import { ScoringEngineService } from './scoring-engine.service';
import { AiAnalysisService } from './ai-analysis.service';
import { OpenRouterService } from './openrouter.service';
import { GeminiService } from './gemini.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkinAnalysis, SkinMetric]),
    RecommendationModule,
  ],
  controllers: [AiController],
  providers: [
    FakeAiService,
    DetectionAdapterService,
    ScoringEngineService,
    AiAnalysisService,
    OpenRouterService,
    GeminiService,
  ],
  exports: [
    FakeAiService,
    DetectionAdapterService,
    ScoringEngineService,
    AiAnalysisService,
    OpenRouterService,
    GeminiService,
  ],
})
export class AiModule { }