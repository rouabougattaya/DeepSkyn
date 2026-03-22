import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkinMetricService } from './skin-metric.service';
import { ScoringService } from '../scoring.service';
import { SkinMetric } from './skin-metric.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([SkinMetric, SkinAnalysis]),
    ],
    providers: [SkinMetricService, ScoringService],
    exports: [SkinMetricService, ScoringService, TypeOrmModule],
})
export class SkinMetricModule { }
