import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { SkinMetricService } from './skinMetric/skin-metric.service';
import { WeightsDto } from './weights.dto';
import { Public } from './auth/decorators/public.decorator';

@Public()
@Controller('analysis')
export class AnalysisController {
    constructor(
        private readonly scoringService: ScoringService,
        private readonly skinMetricService: SkinMetricService,
    ) { }

    @Post('recalculate/:id')
    async recalculate(@Param('id') id: string, @Body() weights: WeightsDto) {
        const score = await this.skinMetricService.recalculateAnalysisScore(id, weights);
        return { id, skinScore: score };
    }
}
