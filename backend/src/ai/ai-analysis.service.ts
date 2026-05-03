import { Injectable } from '@nestjs/common';
import { FakeAiService } from './fake-ai.service';
import { DetectionAdapterService } from './detection-adapter.service';
import { ScoringEngineService } from './scoring-engine.service';
import { OpenRouterService } from './openrouter.service';
import { RawDetection, GlobalScoreResult, ConditionWeights, UserSkinProfile } from './detection.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { UserProfile } from '../userProfile/user-profile.entity';
import { RecommendationService } from '../recommendation/recommendation.service';
import { SkinCondition } from './skin-condition.enum';
import { IncompatibilityService } from '../routine/incompatibility.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly fakeAiService: FakeAiService,
    private readonly detectionAdapter: DetectionAdapterService,
    private readonly scoringEngine: ScoringEngineService,
    private readonly openRouterService: OpenRouterService,
    private readonly recommendationService: RecommendationService,
    private readonly incompatibilityService: IncompatibilityService,
    @InjectRepository(SkinAnalysis)
    private readonly analysisRepo: Repository<SkinAnalysis>,
    @InjectRepository(SkinMetric)
    private readonly metricRepo: Repository<SkinMetric>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  /**
   * Analyse complète d'une image
   * Flow: IA → Adapter → Scoring Engine → Résultat
   */
  async analyzeImage(
    imageId?: string,
    customWeights?: Partial<ConditionWeights>,
    testType?: 'severe' | 'mild' | 'mixed',
    userId: string = '',
    analysisAge?: number
  ): Promise<GlobalScoreResult> {
    try {
      await this.enforceAnalysisLimit(userId);

      const rawDetections = testType
        ? this.fakeAiService.generateTestCase(testType)
        : await this.fakeAiService.analyzeImage(imageId);

      if (!this.detectionAdapter.validateDetections(rawDetections)) {
        throw new Error('Invalid detection format from AI model');
      }

      const metrics = this.detectionAdapter.aggregateDetections(rawDetections);
      const conditionScores = this.scoringEngine.computeConditionScores(metrics);
      const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights);

      if (userId && (imageId || testType || result.globalScore > 0)) {
        const saved = await this.persistResult(result, imageId || 'test_scenario', userId, analysisAge);
        if (saved?.recommendations) {
          result.recommendations = saved.recommendations;
        }
      }

      if (!result.recommendations) {
        result.recommendations = await this.getGuestRecommendations(result);
      }

      if (result.recommendations?.length > 0) {
        const checkResult = this.incompatibilityService.checkRoutine(result.recommendations);
        result.compatibilityWarning = checkResult.message;
      }

      if (userId) {
        await this.subscriptionService.incrementImages(userId);
      }

      return result;
    } catch (error) {
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  private async getGuestRecommendations(result: any) {
    let inferredSkinType = 'Normal';
    const dominant = result.analysis?.dominantCondition;
    if (dominant === SkinCondition.ACNE || dominant === SkinCondition.PORES) inferredSkinType = 'Oily';
    else if (dominant === SkinCondition.REDNESS) inferredSkinType = 'Sensitive';
    else if (result.globalScore < 40) inferredSkinType = 'Dry';

    return this.recommendationService.getRecommendationsForSkinState(
      'guest',
      'temporary',
      inferredSkinType
    );
  }

  async analyzeWithRandomDetections(
    seed?: number,
    customWeights?: Partial<ConditionWeights>,
    userId: string = '',
    analysisAge?: number
  ): Promise<GlobalScoreResult> {
    const rawDetections = this.fakeAiService.generateRandomDetections(seed);
    const metrics = this.detectionAdapter.aggregateDetections(rawDetections);
    const conditionScores = this.scoringEngine.computeConditionScores(metrics);
    const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights);

    if (userId && result.globalScore > 0) {
      const saved = await this.persistResult(result, `seed_${seed || 'rand'}`, userId, analysisAge);
      if (saved?.recommendations) {
        result.recommendations = saved.recommendations;
      }
    }

    if (result.recommendations?.length > 0) {
      const checkResult = this.incompatibilityService.checkRoutine(result.recommendations);
      result.compatibilityWarning = checkResult.message;
    }

    return result;
  }

  /**
   * Analyse unifiée utilisant le LLM
   */
  async analyzeSkinWithLLM(
    profile: UserSkinProfile,
    userId: string = ''
  ): Promise<GlobalScoreResult> {
    try {
      const plan = await this.getSubscriptionPlan(userId);
      await this.enforceAnalysisLimit(userId);

      console.log(`[analyzeSkinWithLLM] Starting analysis for userId: ${userId}, skinType: ${profile.skinType}`);
      const result = await this.openRouterService.analyzeSkin(profile, plan);

      const hasPhoto = Boolean(profile.imageBase64 || (profile.imagesBase64 && profile.imagesBase64.length > 0));
      const { aiWeight, userWeight } = this.calculateWeights(hasPhoto);
      
      const combinedInsights = this.processConditionScores(result, profile, hasPhoto, aiWeight, userWeight);
      
      this.calculateGlobalScoreAndAnalysis(result);

      result.metaWeighting = { aiWeight, userWeight };
      result.userInputs = this.extractUserInputs(profile);
      result.combinedInsights = combinedInsights;

      await this.handleAgeEstimation(result, profile, hasPhoto);

      if (userId && result.globalScore > 0) {
        const saved = await this.persistResult(result, 'unified_llm', userId, profile.age);
        if (saved?.recommendations) {
          result.recommendations = saved.recommendations;
        }
      }

      if (!result.recommendations) {
        result.recommendations = await this.getFallbackRecommendations(userId, profile, result.conditionScores);
      }

      if (result.recommendations?.length > 0) {
        const checkResult = this.incompatibilityService.checkRoutine(result.recommendations);
        result.compatibilityWarning = checkResult.message;
      }

      if (userId) {
        await this.subscriptionService.incrementImages(userId);
      }

      return result;
    } catch (error) {
      throw new Error(`LLM Analysis failed: ${error.message}`);
    }
  }

  private async getSubscriptionPlan(userId: string): Promise<string> {
    if (!userId) return 'FREE';
    const sub = await this.subscriptionService.getSubscription(userId);
    return sub.plan;
  }

  private async enforceAnalysisLimit(userId: string): Promise<void> {
    if (!userId) return;
    const { allowed } = await this.subscriptionService.checkAnalysisLimit(userId);
    if (!allowed) {
      throw new Error('LIMIT_REACHED');
    }
  }

  private calculateWeights(hasPhoto: boolean) {
    return {
      aiWeight: hasPhoto ? 1 : 0,
      userWeight: hasPhoto ? 0 : 1
    };
  }

  private processConditionScores(result: any, profile: UserSkinProfile, hasPhoto: boolean, aiWeight: number, userWeight: number) {
    const combinedInsights: any = {};
    const conditionMap: Array<{ field: keyof UserSkinProfile; condition: SkinCondition }> = [
      { field: 'acneLevel', condition: SkinCondition.ACNE },
      { field: 'blackheadsLevel', condition: SkinCondition.BLACKHEADS },
      { field: 'poreSize', condition: SkinCondition.PORES },
      { field: 'rednessLevel', condition: SkinCondition.REDNESS },
      { field: 'hydrationLevel', condition: SkinCondition.HYDRATION },
      { field: 'wrinklesDepth', condition: SkinCondition.WRINKLES },
    ];

    if (!result.conditionScores) result.conditionScores = [];

    conditionMap.forEach(({ field, condition }) => {
      const insight = this.processSingleConditionScore(result, profile, condition, field, hasPhoto, aiWeight, userWeight);
      if (insight) {
        combinedInsights[condition] = insight;
      }
    });

    return combinedInsights;
  }

  private processSingleConditionScore(
    result: any,
    profile: UserSkinProfile,
    condition: SkinCondition,
    field: keyof UserSkinProfile,
    hasPhoto: boolean,
    aiWeight: number,
    userWeight: number
  ) {
    const userScore = profile[field];
    const numericUserScore = typeof userScore === 'number' ? userScore : undefined;
    let conditionEntry = result.conditionScores.find((c: any) => c.type === condition);

    if (!conditionEntry) {
      conditionEntry = { type: condition, score: null, count: 0, severity: null, evaluated: false };
      result.conditionScores.push(conditionEntry);
    }

    const aiEvaluated = hasPhoto && conditionEntry && conditionEntry.evaluated !== false && typeof conditionEntry.score === 'number';
    const userDeclared = typeof numericUserScore === 'number';
    const shouldEvaluate = hasPhoto ? aiEvaluated : userDeclared;

    if (!shouldEvaluate) {
      this.markConditionNotEvaluated(conditionEntry, hasPhoto, userDeclared);
      return null;
    }

    const aiScore = aiEvaluated ? (conditionEntry.score ?? null) : null;
    const baseUser = userDeclared ? this.toGoodScore(condition, numericUserScore) : null;

    const combinedScore = this.calculateCombinedScore(aiScore, baseUser, aiWeight, userWeight);

    conditionEntry.evaluated = true;
    conditionEntry.notEvaluatedReason = null;
    conditionEntry.score = combinedScore;
    conditionEntry.severity = Math.max(0, Math.min(1, 1 - combinedScore / 100));
    conditionEntry.count = conditionEntry.count ?? 0;

    return {
      aiScore,
      userScore: numericUserScore,
      combinedScore,
      weight: { ai: aiWeight, user: userWeight },
    };
  }

  private markConditionNotEvaluated(conditionEntry: any, hasPhoto: boolean, userDeclared: boolean) {
    conditionEntry.evaluated = false;
    conditionEntry.score = null;
    conditionEntry.severity = null;
    conditionEntry.count = conditionEntry.count ?? 0;
    if (hasPhoto) {
      conditionEntry.notEvaluatedReason = userDeclared
        ? 'Declare par utilisateur mais non detecte sur la photo'
        : 'Non detecte sur la photo';
    } else {
      conditionEntry.notEvaluatedReason = 'Ni detecte sur image, ni renseigne par utilisateur';
    }
  }

  private calculateCombinedScore(aiScore: number | null, baseUser: number | null, aiWeight: number, userWeight: number): number {
    if (typeof aiScore === 'number' && typeof baseUser === 'number') {
      return Math.round(aiScore * aiWeight + baseUser * userWeight);
    }
    return (aiScore ?? baseUser)!;
  }

  private calculateGlobalScoreAndAnalysis(result: any) {
    const evaluatedConditionScores = result.conditionScores.filter(
      (c: any) => c.evaluated !== false && typeof c.score === 'number',
    );

    if (evaluatedConditionScores.length) {
      const averaged = evaluatedConditionScores.reduce((sum: number, c: any) => sum + (c.score ?? 0), 0) / evaluatedConditionScores.length;
      result.globalScore = Math.round(averaged * 10) / 10;
      
      const sorted = [...evaluatedConditionScores].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
      result.analysis = {
        bestCondition: sorted[0]?.type ?? null,
        worstCondition: sorted[sorted.length - 1]?.type ?? null,
        dominantCondition: sorted[sorted.length - 1]?.type ?? null,
      };
    } else {
      result.globalScore = 0;
      result.analysis = { bestCondition: null, worstCondition: null, dominantCondition: null };
    }
  }

  private extractUserInputs(profile: UserSkinProfile) {
    return {
      acneLevel: profile.acneLevel,
      blackheadsLevel: profile.blackheadsLevel,
      poreSize: profile.poreSize,
      wrinklesDepth: profile.wrinklesDepth,
      sensitivityLevel: profile.sensitivityLevel,
      hydrationLevel: profile.hydrationLevel,
      rednessLevel: profile.rednessLevel,
    };
  }

  private async handleAgeEstimation(result: any, profile: UserSkinProfile, hasPhoto: boolean) {
    if (typeof profile.age !== 'number') return;

    try {
      if (hasPhoto) {
        const agePrediction = await this.openRouterService.estimateSkinAge(profile);
        if (Number.isFinite(agePrediction.skinAge)) {
          result.skinAge = Math.round(agePrediction.skinAge);
        }
        if (typeof agePrediction.rationale === 'string' && agePrediction.rationale.trim()) {
          result.skinAgeRationale = agePrediction.rationale.trim();
        }
      }

      if (result.skinAge === undefined || result.skinAge === null) {
        const normalizedScore = Math.max(0, Math.min(100, result.globalScore ?? 0));
        const ageAdjustment = (50 - normalizedScore) / 5;
        result.skinAge = Math.round(profile.age + ageAdjustment);
        if (!result.skinAgeRationale) {
          result.skinAgeRationale = `Age estimé basé sur un score global de ${result.globalScore}/100 et un âge réel de ${profile.age} ans.`;
        }
      }
    } catch (e: any) {
      console.warn(`[analyzeSkinWithLLM] Skin age estimation error: ${e?.message || e}`);
      const normalizedScore = Math.max(0, Math.min(100, result.globalScore ?? 0));
      const ageAdjustment = (50 - normalizedScore) / 5;
      result.skinAge = Math.round(profile.age + ageAdjustment);
    }
  }

  private async getFallbackRecommendations(userId: string, profile: UserSkinProfile, conditionScores: any[]) {
    const conditionToConcern = (type: string): string => {
      const normalized = String(type || '').toLowerCase();
      const mapping: Record<string, string> = {
        'acne': 'acne',
        'blackheads': 'blackheads',
        'enlarged-pores': 'pores',
        'skin redness': 'redness',
        'hydration': 'dryness',
        'wrinkles': 'wrinkles',
        'dark-spots': 'dark_spots',
        'black_dots': 'blackheads'
      };
      return mapping[normalized] || normalized;
    };

    const evaluatedConcerns = Array.from(
      new Set<string>(
        conditionScores
          .filter((c: any) => c.evaluated !== false && typeof c.score === 'number')
          .map((c: any) => conditionToConcern(c.type))
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      ),
    );

    return this.recommendationService.getRecommendationsForSkinState(
      userId || 'guest',
      'temporary',
      profile.skinType || 'Normal',
      evaluatedConcerns,
    );
  }

  private toGoodScore(condition: SkinCondition, rawScore?: number): number {
    const safeScore = typeof rawScore === 'number' ? rawScore : 50;
    switch (condition) {
      case SkinCondition.ACNE:
      case SkinCondition.BLACKHEADS:
      case SkinCondition.PORES:
      case SkinCondition.REDNESS:
      case SkinCondition.WRINKLES:
        return 100 - safeScore;
      case SkinCondition.HYDRATION:
      default:
        return safeScore;
    }
  }



  /**
   * Retourne les poids par défaut
   */
  getDefaultWeights(): ConditionWeights {
    return this.scoringEngine.getDefaultWeights();
  }

  /**
   * Valide des poids personnalisés
   */
  validateWeights(weights: Partial<ConditionWeights>): boolean {
    return this.scoringEngine.validateWeights(weights);
  }

  /**
   * Analyse pour le debugging - retourne toutes les étapes
   */
  async debugAnalysis(
    imageId?: string,
    customWeights?: Partial<ConditionWeights>
  ): Promise<{
    rawDetections: RawDetection[];
    metrics: any[];
    conditionScores: any[];
    result: GlobalScoreResult;
  }> {
    const rawDetections = await this.fakeAiService.analyzeImage(imageId);
    const metrics = this.detectionAdapter.aggregateDetections(rawDetections);
    const conditionScores = this.scoringEngine.computeConditionScores(metrics);
    const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights);

    return {
      rawDetections,
      metrics,
      conditionScores,
      result,
    };
  }

  /**
   * Valeur par défaut réaliste pour une métrique manquante (50–80).
   */
  private static defaultMetricValue(): number {
    return 50;
  }

  /**
   * Extrait hydration, oil, acne, wrinkles depuis conditionScores pour la comparaison.
   */
  private getComparisonMetricsFromConditions(conditionScores: GlobalScoreResult['conditionScores']): {
    hydration: number;
    oil: number;
    acne: number;
    wrinkles: number;
  } {
    const findScore = (type: SkinCondition | string) =>
      conditionScores.find(c => String(c.type).toLowerCase() === String(type).toLowerCase())?.score;
    const def = () => 50;
    const result = {
      hydration: findScore(SkinCondition.HYDRATION) ?? def(),
      oil: findScore(SkinCondition.PORES) ?? findScore('oil') ?? def(),
      acne: findScore(SkinCondition.ACNE) ?? def(),
      wrinkles: findScore(SkinCondition.WRINKLES) ?? def(),
    };
    console.log(`[getComparisonMetricsFromConditions] Extracted metrics:`, result, `from conditions:`, conditionScores.map(c => ({ type: c.type, score: c.score })));
    return result;
  }

  /**
   * Sauvegarde les résultats en base de données.
   */
  private async persistResult(result: GlobalScoreResult, imageId: string, userId: string, userInputAge?: number) {
    if (!userId) {
      console.error('❌ userId manquant, analyse non sauvegardée');
      return null;
    }

    try {
      const comparisonMetrics = this.getComparisonMetricsFromConditions(result.conditionScores);
      const realAge: number | null = userInputAge ?? null;
      const skinAge = this.calculateSkinAge(realAge, result.globalScore);

      console.log(`[persistResult] Saving analysis - realAge: ${realAge}, globalScore: ${result.globalScore}, skinAge: ${skinAge}`);

      const analysis = this.analysisRepo.create({
        userId,
        status: 'COMPLETED',
        skinScore: result.globalScore ?? 0,
        skinAge,
        realAge: realAge ?? undefined,
        summary: `Analyse multi-critères réalisée. Score global: ${(result.globalScore ?? 0).toFixed(1)}/100.`,
        aiRawResponse: {
          imageId,
          timestamp: new Date().toISOString(),
          realAgeSource: 'analysis-input',
          userInputAge: realAge ?? null,
        },
        hydration: comparisonMetrics.hydration,
        oil: comparisonMetrics.oil,
        acne: comparisonMetrics.acne,
        wrinkles: comparisonMetrics.wrinkles,
      });

      const savedAnalysis = await this.analysisRepo.save(analysis);

      const metrics = result.conditionScores.map(condition => (
        this.metricRepo.create({
          analysisId: savedAnalysis.id,
          metricType: condition.type,
          score: condition.evaluated === false ? 0 : (condition.score ?? AiAnalysisService.defaultMetricValue()),
          severityLevel: `Severity ${(condition.severity ?? 0).toFixed(1)}`,
        })
      ));

      await this.metricRepo.save(metrics);

      const inferredSkinType = this.inferSkinType(result);
      const recommendations = await this.recommendationService.getRecommendationsForSkinState(
        userId,
        savedAnalysis.id,
        inferredSkinType
      );

      return { ...savedAnalysis, recommendations };
    } catch (error) {
      console.error('❌ Failed to persist AI analysis:', error.message);
      return null;
    }
  }

  private calculateSkinAge(realAge: number | null, globalScore: number): number {
    const baselineAge = realAge ?? 25;
    const normalizedScore = Math.max(0, Math.min(100, globalScore ?? 0));
    const ageAdjustment = (50 - normalizedScore) / 5;
    return Math.round(baselineAge + ageAdjustment);
  }

  private inferSkinType(result: GlobalScoreResult): string {
    const dominant = result.analysis?.dominantCondition;
    if (dominant === SkinCondition.ACNE || dominant === SkinCondition.PORES) return 'Oily';
    if (dominant === SkinCondition.REDNESS) return 'Sensitive';
    if (result.globalScore < 40) return 'Dry';
    return 'Normal';
  }

  /**
   * Predict future skin state using LLM
   * Used for Digital Twin simulations
   */
  async predictFutureSkin(context: string): Promise<any> {
    try {
      // Call OpenRouter to generate future skin predictions
      const prediction = await this.openRouterService.predictFutureSkinState(context);
      return prediction;
    } catch (error) {
      console.error('Future skin prediction failed:', error);
      // Return empty object - fallback will be handled by caller
      return {};
    }
  }

  /**
   * Calcule l'âge réel depuis le profil utilisateur si disponible.
   */
  private async resolveRealAge(userId: string): Promise<number | null> {
    if (!userId) return null;
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile?.birthDate) return null;
    const birth = new Date(profile.birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const ageMs = Date.now() - birth.getTime();
    const age = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
    return Number.isFinite(age) ? age : null;
  }
}