import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { InsightsModule } from '../insights/insights.module';
import { Product } from '../products/entities/product.entity';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RoutinePersonalization } from './routine-personalization.entity';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { RoutinePersonalizationService } from './routine-personalization.service';
import { IncompatibilityService } from './incompatibility.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Routine,
      RoutineStep,
      Product,
      SkinAnalysis,
      RoutinePersonalization,
    ]),
    RecommendationModule,
    InsightsModule,
  ],
  controllers: [RoutineController],
  providers: [RoutineService, RoutinePersonalizationService, IncompatibilityService],
  exports: [RoutineService, RoutinePersonalizationService, IncompatibilityService],
})
export class RoutineModule { }
