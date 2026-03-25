import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { SkinMetricModule } from '../skinMetric/skin-metric.module';
import { SkinAgeInsightsService } from './skin-age-insights.service';
import { SkinAgeController } from './skin-age.controller';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { UserProfile } from '../userProfile/user-profile.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, UserProfile]),
        SkinMetricModule,
        RecommendationModule,
    ],
    controllers: [SkinAgeController],
    providers: [InsightsService, SkinAgeInsightsService],
    exports: [InsightsService, SkinAgeInsightsService],
})
export class InsightsModule { }
