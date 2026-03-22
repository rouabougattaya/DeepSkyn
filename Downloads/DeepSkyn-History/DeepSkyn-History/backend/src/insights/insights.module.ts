import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { SkinMetricModule } from '../skinMetric/skin-metric.module';

@Module({
    imports: [
        SkinMetricModule,
    ],
    providers: [InsightsService],
    exports: [InsightsService],
})
export class InsightsModule { }
