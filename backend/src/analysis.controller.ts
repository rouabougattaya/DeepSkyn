import { Controller, Get, Post, Body, Param, Query, BadRequestException, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { SkinMetricService } from './skinMetric/skin-metric.service';
import { WeightsDto } from './weights.dto';
import { Public } from './auth/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { JwtAccessGuard } from './auth/guards/jwt-access.guard';
import { User } from './user/user.entity';
import { InsightsService } from './insights/insights.service';

@Controller('analysis')
export class AnalysisController {
    private readonly logger = new Logger(AnalysisController.name);

    constructor(
        private readonly scoringService: ScoringService,
        private readonly skinMetricService: SkinMetricService,
        private readonly insightsService: InsightsService,
    ) { }

    /**
     * GET /analysis/user — Liste des analyses de l'utilisateur connecté.
     * Protégé par JwtAccessGuard : le token doit être envoyé dans l'en-tête Authorization.
     * Filtre strict par userId (chaque utilisateur ne voit que ses analyses).
     * Résultat trié par date décroissante (plus récent en premier).
     */
    @UseGuards(JwtAccessGuard)
    @Get('user')
    async getUserAnalyses(
        @CurrentUser() user: User | { id: string },
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10'
    ) {
        const userId = user?.id;
        if (!userId) {
            this.logger.warn('GET /analysis/user called but user.id is missing');
            throw new UnauthorizedException('User ID is required');
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;

        this.logger.log(`GET /analysis/user — userId=${userId}, page=${pageNum}, limit=${limitNum}`);
        const result = await this.skinMetricService.getUserAnalyses(userId, pageNum, limitNum);
        this.logger.log(`GET /analysis/user — returned ${result.data.length} analyses (total ${result.total}) for userId=${userId}`);
        return result;
    }


    @Public()
    @Get('compare')
    async compare(
        @Query('firstId') firstId: string,
        @Query('secondId') secondId: string,
    ) {
        if (!firstId || !secondId) {
            throw new BadRequestException('firstId and secondId are required');
        }
        return this.skinMetricService.compare(firstId, secondId);
    }

    @Public()
    @Post('recalculate/:id')
    async recalculate(@Param('id') id: string, @Body() weights: WeightsDto) {
        const score = await this.skinMetricService.recalculateAnalysisScore(id, weights);
        return { id, skinScore: score };
    }

    @UseGuards(JwtAccessGuard)
    @Get('insights')
    async getInsights(@CurrentUser() user: any) {
        const userId = user?.id;
        if (!userId) {
            throw new UnauthorizedException('User ID is required');
        }
        return this.insightsService.generateInsights(userId);
    }

    @UseGuards(JwtAccessGuard)
    @Get(':id')
    async getAnalysis(@Param('id') id: string) {
        return this.skinMetricService.getAnalysisById(id);
    }
}
