import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalTwinController } from './digital-twin.controller';
import { DigitalTwinService } from './digital-twin.service';
import { DigitalTwinSimulation } from './digital-twin.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { Routine } from '../routine/routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DigitalTwinSimulation, SkinAnalysis, Routine, RoutineStep]),
    AiModule,
  ],
  controllers: [DigitalTwinController],
  providers: [DigitalTwinService],
  exports: [DigitalTwinService],
})
export class DigitalTwinModule {}
