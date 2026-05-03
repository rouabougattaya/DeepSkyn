import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalTwinSimulation } from './digital-twin.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { Routine } from '../routine/routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { 
  CreateDigitalTwinDto, 
  DigitalTwinResponseDto, 
  DigitalTwinTimelineDto,
  MonthPrediction,
} from './digital-twin.dto';

type TimePoint = 'month1' | 'month3' | 'month6';
type RoutineConsistency = 'high' | 'medium' | 'low';

@Injectable()
export class DigitalTwinService {
  private readonly logger = new Logger('DigitalTwinService');

  constructor(
    @InjectRepository(DigitalTwinSimulation)
    private digitalTwinRepo: Repository<DigitalTwinSimulation>,
    @InjectRepository(SkinAnalysis)
    private skinAnalysisRepo: Repository<SkinAnalysis>,
    @InjectRepository(Routine)
    private routineRepo: Repository<Routine>,
    @InjectRepository(RoutineStep)
    private routineStepRepo: Repository<RoutineStep>,
    private aiAnalysisService: AiAnalysisService,
  ) {}

  /**
   * Create a digital twin simulation based on current analysis and routine
   */
  async createDigitalTwin(
    userId: string,
    dto: CreateDigitalTwinDto,
  ): Promise<DigitalTwinResponseDto> {
    try {
      this.logger.log(`🌟 Creating digital twin for user: ${userId}, analysis: ${dto.baseAnalysisId}`);

      // 1. Get the base analysis
      const baseAnalysis = await this.skinAnalysisRepo.findOne({
        where: { id: dto.baseAnalysisId, userId },
      });

      if (!baseAnalysis) {
        this.logger.error(`❌ Base analysis not found: ${dto.baseAnalysisId} for user ${userId}`);
        throw new BadRequestException('Base analysis not found');
      }

      this.logger.log(`✅ Base analysis found: score ${baseAnalysis.skinScore}`);

      // 2. Get user's current routine (AM and PM)
      const routines = await this.routineRepo.find({
        where: { userId },
      });

      this.logger.log(`📋 Found ${routines.length} routines for user`);

      // 3. Get routine steps (flat query by routineId)
      let productNames: string[] = [];
      if (routines.length > 0) {
        const routineIds = routines.map((r) => r.id);
        
        // Query routineSteps by routineId (no relation)
        const routineSteps = await this.routineStepRepo.find({
          where: routineIds.map((rid) => ({ routineId: rid })),
        });

        this.logger.log(`🔧 Found ${routineSteps.length} routine steps`);

        // Extract productIds - these are stored as productId field
        const productIds = routineSteps
          .map((step) => step.productId)
          .filter((id) => !!id)
          .slice(0, 10);

        this.logger.log(`💊 Product IDs from routine: ${productIds.join(', ') || 'none'}`);

        // For now, use productId as product name (in future, join with products table)
        productNames = productIds;
      }

      if (productNames.length === 0) {
        this.logger.warn(`⚠️ No products found in routine, using generic products`);
        productNames = ['Cleanser', 'Moisturizer', 'Sunscreen'];
      }

      // 4. Prepare simulation context
      const routineConsistency = dto.routineConsistency || 'medium';
      const lifestyleFactors = dto.lifestyleFactors || [];

      this.logger.log(`⚙️ Simulation params: consistency=${routineConsistency}, factors=${lifestyleFactors.length}`);

      // 5. Call AI to simulate future states
      this.logger.log(`🤖 Calling AI to simulate future skin...`);
      const predictions = await this.simulateFutureSkin(
        baseAnalysis,
        productNames,
        routineConsistency,
        lifestyleFactors,
      );

      this.logger.log(`✅ AI predictions completed`);

      // 6. Create and save digital twin record
      const digitalTwin = this.digitalTwinRepo.create({
        userId,
        baseAnalysisId: dto.baseAnalysisId,
        month1Prediction: predictions.month1,
        month3Prediction: predictions.month3,
        month6Prediction: predictions.month6,
        simulationContext: {
          routineConsistency,
          lifestyleFactors,
          currentSkinType: this.inferSkinType(baseAnalysis),
          mainConcerns: this.inferMainConcerns(baseAnalysis),
        },
        overallRecommendation: this.generateOverallRecommendation(predictions),
      });

      const saved = await this.digitalTwinRepo.save(digitalTwin);
      this.logger.log(`✅ Digital twin saved: ${saved.id}`);
      
      return this.mapToDto(saved);
    } catch (error) {
      this.logger.error(`❌ Error creating digital twin:`, error);
      const err = error as Error;
      throw new BadRequestException(
        error instanceof BadRequestException 
          ? err.message 
          : `Failed to create digital twin: ${err.message}`
      );
    }
  }

  /**
   * Get a specific digital twin by ID
   */
  async getDigitalTwin(id: string, userId: string): Promise<DigitalTwinResponseDto> {
    const twin = await this.digitalTwinRepo.findOne({
      where: { id, userId },
    });

    if (!twin) {
      throw new BadRequestException('Digital twin not found');
    }

    return this.mapToDto(twin);
  }

  /**
   * Get the timeline view with current state and predictions
   */
  async getDigitalTwinTimeline(
    id: string,
    userId: string,
  ): Promise<DigitalTwinTimelineDto> {
    const twin = await this.digitalTwinRepo.findOne({
      where: { id, userId },
    });

    if (!twin) {
      throw new BadRequestException('Digital twin not found');
    }

    const baseAnalysis = await this.skinAnalysisRepo.findOne({
      where: { id: twin.baseAnalysisId },
    });

    if (!baseAnalysis) {
      throw new BadRequestException('Base analysis not found');
    }

    // Determine best and worst outcomes
    const scores = [
      twin.month1Prediction.skinScore,
      twin.month3Prediction.skinScore,
      twin.month6Prediction.skinScore,
    ];

    const bestIndex = scores.indexOf(Math.max(...scores));
    const worstIndex = scores.indexOf(Math.min(...scores));

    const monthLabels: TimePoint[] = ['month1', 'month3', 'month6'];

    return {
      currentState: {
        skinScore: baseAnalysis.skinScore,
        skinAge: baseAnalysis.skinAge,
        metrics: {
          hydration: baseAnalysis.hydration,
          oil: baseAnalysis.oil,
          acne: baseAnalysis.acne,
          wrinkles: baseAnalysis.wrinkles,
        },
        createdAt: baseAnalysis.createdAt,
      },
      predictions: {
        month1: twin.month1Prediction,
        month3: twin.month3Prediction,
        month6: twin.month6Prediction,
      },
      trends: {
        bestOutcome: monthLabels[bestIndex],
        worstOutcome: monthLabels[worstIndex],
        overallTrajectory: this.calculateTrajectory(baseAnalysis.skinScore, scores),
      },
    };
  }

  /**
   * Get latest digital twin for a user
   */
  async getLatestDigitalTwin(userId: string): Promise<DigitalTwinResponseDto | null> {
    const twin = await this.digitalTwinRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return twin ? this.mapToDto(twin) : null;
  }

  /**
   * AI Simulation: Predict future skin state
   * This orchestrates calls to the AI service to simulate skin at different timepoints
   */
  private async simulateFutureSkin(
    baseAnalysis: SkinAnalysis,
    productNames: string[],
    routineConsistency: RoutineConsistency,
    lifestyleFactors: string[],
  ): Promise<{
    month1: MonthPrediction;
    month3: MonthPrediction;
    month6: MonthPrediction;
  }> {
    // Build simulation prompt context
    const context = this.buildSimulationContext(
      baseAnalysis,
      productNames,
      routineConsistency,
      lifestyleFactors,
    );

    try {
      // Call AI service to get predictions
      // We can use the OpenRouter or Gemini service for unified LLM analysis
      const aiResponse = await this.aiAnalysisService.predictFutureSkin(context);

      // Parse AI response into month predictions
      return {
        month1: this.parseMonthPrediction(aiResponse, 'month1', baseAnalysis),
        month3: this.parseMonthPrediction(aiResponse, 'month3', baseAnalysis),
        month6: this.parseMonthPrediction(aiResponse, 'month6', baseAnalysis),
      };
    } catch (error) {
      this.logger.error('AI simulation failed, using fallback', error);
      // Fallback: generate realistic projections based on current metrics
      return this.generateFallbackPredictions(baseAnalysis, routineConsistency);
    }
  }

  /**
   * Build context for AI simulation
   */
  private buildSimulationContext(
    baseAnalysis: SkinAnalysis,
    productNames: string[],
    routineConsistency: RoutineConsistency,
    lifestyleFactors: string[],
  ): string {
    return `
Digital Twin Skin Simulation Request:

CURRENT STATE:
- Skin Score: ${baseAnalysis.skinScore}/100
- Skin Age: ${baseAnalysis.skinAge} years
- Hydration: ${baseAnalysis.hydration}
- Oil: ${baseAnalysis.oil}
- Acne: ${baseAnalysis.acne}
- Wrinkles: ${baseAnalysis.wrinkles}

ROUTINE:
- Products: ${productNames.join(', ')}
- Consistency: ${routineConsistency}

LIFESTYLE FACTORS:
${lifestyleFactors.length > 0 ? lifestyleFactors.map((f) => `- ${f}`).join('\n') : '- Standard lifestyle'}

TASK:
Predict the skin state at 3 timepoints (1 month, 3 months, 6 months) assuming:
- User follows the routine with ${routineConsistency} consistency
- No major lifestyle changes

For each timepoint, provide:
1. Projected skin score (0-100)
2. Projected skin age
3. Individual metrics (hydration, oil, acne, wrinkles)
4. List of improvements (specific conditions that improved)
5. List of degradations (if any)
6. Brief summary

Return as JSON with keys: month1, month3, month6
Each should have: skinScore, skinAge, metrics{hydration, oil, acne, wrinkles}, improvements[], degradations[], summary
    `;
  }

  /**
   * Parse AI response into typed prediction
   */
  private parseMonthPrediction(
    aiResponse: any,
    month: TimePoint,
    baseAnalysis: SkinAnalysis,
  ): MonthPrediction {
    try {
      const monthData = aiResponse[month];

      return {
        skinScore: monthData.skinScore || baseAnalysis.skinScore,
        skinAge: monthData.skinAge || baseAnalysis.skinAge,
        metrics: {
          hydration: monthData.metrics?.hydration || baseAnalysis.hydration,
          oil: monthData.metrics?.oil || baseAnalysis.oil,
          acne: monthData.metrics?.acne || baseAnalysis.acne,
          wrinkles: monthData.metrics?.wrinkles || baseAnalysis.wrinkles,
        },
        improvements: monthData.improvements || [],
        degradations: monthData.degradations || [],
        summary: monthData.summary || `Projected skin state at ${month.replace('month', '')} month(s)`,
      };
    } catch (error) {
      this.logger.error(`Error parsing ${month} prediction:`, error);
      return this.generateFallbackMonthPrediction(baseAnalysis, month);
    }
  }

  /**
   * Generate fallback predictions (when AI fails)
   */
  private generateFallbackPredictions(
    baseAnalysis: SkinAnalysis,
    routineConsistency: RoutineConsistency,
  ) {
    // Define improvement rates based on routine consistency
    const improvementRates = {
      high: { month1: 0.03, month3: 0.1, month6: 0.2 }, // 3%, 10%, 20% improvement
      medium: { month1: 0.01, month3: 0.05, month6: 0.1 }, // 1%, 5%, 10% improvement
      low: { month1: 0.0, month3: -0.02, month6: -0.05 }, // stable, slight regression
    };

    const rates = improvementRates[routineConsistency];

    return {
      month1: this.generateFallbackMonthPrediction(baseAnalysis, 'month1', rates.month1),
      month3: this.generateFallbackMonthPrediction(baseAnalysis, 'month3', rates.month3),
      month6: this.generateFallbackMonthPrediction(baseAnalysis, 'month6', rates.month6),
    };
  }

  /**
   * Generate single month fallback prediction
   */
  private generateFallbackMonthPrediction(
    baseAnalysis: SkinAnalysis,
    month: TimePoint,
    improvementRate?: number,
  ): MonthPrediction {
    const monthNum = parseInt(month.replace('month', ''));
    const rate = improvementRate ?? this.resolveImprovementRate(monthNum);

    const newScore = Math.min(100, baseAnalysis.skinScore + baseAnalysis.skinScore * rate);
    const newAge = Math.max(0, baseAnalysis.skinAge - monthNum * 0.5);

    const improvements: string[] = [];
    const degradations: string[] = [];

    // Simple logic: if improvement rate is positive, mark main concern as improved
    if (rate > 0) {
      if (baseAnalysis.acne > 60)
        improvements.push('Acne severity reduced');
      if (baseAnalysis.wrinkles > 50)
        improvements.push('Fine lines appearance minimized');
      if (baseAnalysis.oil > 70)
        improvements.push('Oil regulation improved');
      if (baseAnalysis.hydration < 40)
        improvements.push('Hydration significantly increased');
    } else if (rate < 0) {
      degradations.push('Some metrics may show less improvement without routine consistency');
    }

    return {
      skinScore: Math.round(newScore),
      skinAge: Math.round(newAge * 10) / 10,
      metrics: {
        hydration: Math.min(100, baseAnalysis.hydration + baseAnalysis.hydration * rate * 0.8),
        oil: Math.max(0, baseAnalysis.oil * (1 - rate * 0.5)),
        acne: Math.max(0, baseAnalysis.acne * (1 - rate * 1.2)),
        wrinkles: Math.max(0, baseAnalysis.wrinkles * (1 - rate * 0.6)),
      },
      improvements:
        improvements.length > 0 ? improvements : ['Continued routine maintenance recommended'],
      degradations:
        degradations.length > 0
          ? degradations
          : ['No significant degradation expected with consistent routine'],
      summary: `${monthNum}-month projection: Score ${Math.round(newScore)}/100. With consistent routine adherence, expect gradual skin improvement.`,
    };
  }

  private resolveImprovementRate(monthNum: number): number {
    if (monthNum === 1) return 0.02;
    if (monthNum === 3) return 0.06;
    return 0.15;
  }

  /**
   * Calculate overall trajectory
   */
  private calculateTrajectory(
    baseScore: number,
    scores: number[],
  ): 'improvement' | 'degradation' | 'stable' {
    const finalScore = scores[scores.length - 1];
    const diff = finalScore - baseScore;

    if (diff > 5) return 'improvement';
    if (diff < -5) return 'degradation';
    return 'stable';
  }

  /**
   * Infer skin type from analysis metrics
   */
  private inferSkinType(analysis: SkinAnalysis): string {
    if (analysis.oil > 60 && analysis.acne > 50) return 'Oily & Acne-prone';
    if (analysis.hydration < 40) return 'Dry';
    if (analysis.oil > 60) return 'Oily';
    if (analysis.hydration > 70 && analysis.oil < 40) return 'Combination';
    return 'Normal';
  }

  /**
   * Infer main skin concerns
   */
  private inferMainConcerns(analysis: SkinAnalysis): string[] {
    const concerns: string[] = [];

    if (analysis.acne > 50) concerns.push('Acne');
    if (analysis.wrinkles > 60) concerns.push('Wrinkles');
    if (analysis.hydration < 40) concerns.push('Dehydration');
    if (analysis.oil > 70) concerns.push('Oiliness');

    return concerns.length > 0 ? concerns : ['General skin health'];
  }

  /**
   * Generate overall recommendation
   */
  private generateOverallRecommendation(predictions: {
    month1: MonthPrediction;
    month3: MonthPrediction;
    month6: MonthPrediction;
  }): string {
    const month6Score = predictions.month6.skinScore;
    const improvements = [
      ...predictions.month1.improvements,
      ...predictions.month3.improvements,
      ...predictions.month6.improvements,
    ];

    if (month6Score > 85) {
      return `Excellent long-term outlook! Continue your routine consistently to achieve clearer, healthier-looking skin. Key improvements: ${improvements.slice(0, 2).join(', ')}.`;
    } else if (month6Score > 70) {
      return `Positive trajectory. With consistent routine adherence over 6 months, you should see noteable improvements. Focus on: ${improvements[0] || 'routine consistency'}.`;
    } else {
      return `Your routine shows potential for gradual improvement. Stick with it for at least 6 months to see meaningful results. Consider consulting with a dermatologist for personalized advice.`;
    }
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(entity: DigitalTwinSimulation): DigitalTwinResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      baseAnalysisId: entity.baseAnalysisId,
      month1Prediction: entity.month1Prediction,
      month3Prediction: entity.month3Prediction,
      month6Prediction: entity.month6Prediction,
      simulationContext: entity.simulationContext,
      overallRecommendation: entity.overallRecommendation,
      createdAt: entity.createdAt,
    };
  }
}
