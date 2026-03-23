import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { Product } from '../recommendation/product.entity';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Routine, RoutineStep, Product, SkinAnalysis]),
    RecommendationModule,
  ],
  controllers: [RoutineController],
  providers: [RoutineService],
  exports: [RoutineService],
})
export class RoutineModule {}

