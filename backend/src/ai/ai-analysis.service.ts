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
  ): Promise<GlobalScoreResult & { recommendations?: any[] }> {
    try {
      // LIMIT CHECK (DEV 4)
      if (userId) {
        const { allowed } = await this.subscriptionService.checkAnalysisLimit(userId);
        if (!allowed) {
          throw new Error('LIMIT_REACHED');
        }
      }
      // Étape 1: Simulation de l'analyse IA
      const rawDetections = testType
        ? this.fakeAiService.generateTestCase(testType)
        : await this.fakeAiService.analyzeImage(imageId);

      // Étape 2: Validation des détections
      if (!this.detectionAdapter.validateDetections(rawDetections)) {
        throw new Error('Invalid detection format from AI model');
      }

      // Étape 3: Adaptation des détections en métriques
      const metrics = this.detectionAdapter.aggregateDetections(rawDetections);

      // Étape 4: Calcul des scores de condition
      const conditionScores = this.scoringEngine.computeConditionScores(metrics);
      const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights) as any;

      // Étape 6: Sauvegarde et Recommandations
      if (userId && (imageId || testType || result.globalScore > 0)) {
        const saved = await this.persistResult(result, imageId || 'test_scenario', userId, analysisAge);
        if (saved && (saved as any).recommendations) {
          result.recommendations = (saved as any).recommendations;
        }
      }

      // Toujours ajouter des recommandations même si pas de userId (pour le démo/guest mode)
      if (!result.recommendations) {
        let inferredSkinType = 'Normal';
        const dominant = result.analysis?.dominantCondition;
        if (dominant === SkinCondition.ACNE || dominant === SkinCondition.PORES) inferredSkinType = 'Oily';
        else if (dominant === SkinCondition.REDNESS) inferredSkinType = 'Sensitive';
        else if (result.globalScore < 40) inferredSkinType = 'Dry';

        result.recommendations = await this.recommendationService.getRecommendationsForSkinState(
          userId || 'guest',
          'temporary',
          inferredSkinType
        );
      }

      if (result.recommendations && result.recommendations.length > 0) {
        const checkResult = this.incompatibilityService.checkRoutine(result.recommendations);
        (result as any).compatibilityWarning = checkResult.message;
      }

      // INCREMENT USAGE (DEV 4)
      if (userId) {
        await this.subscriptionService.incrementImages(userId);
      }

      return result;

    } catch (error) {
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyse avec détections aléatoires pour les tests
   */
  async analyzeWithRandomDetections(
    seed?: number,
    customWeights?: Partial<ConditionWeights>,
    userId: string = '',
    analysisAge?: number
  ): Promise<GlobalScoreResult> {
    const rawDetections = this.fakeAiService.generateRandomDetections(seed);

    const metrics = this.detectionAdapter.aggregateDetections(rawDetections);
    const conditionScores = this.scoringEngine.computeConditionScores(metrics);
    const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights) as any;

    if (userId && result.globalScore > 0) {
      const saved = await this.persistResult(result, `seed_${seed || 'rand'}`, userId, analysisAge);
      if (saved && (saved as any).recommendations) {
        result.recommendations = (saved as any).recommendations;
      }
    } else {
      console.warn('⚠️ userId manquant, analyse aléatoire non sauvegardée');
    }

    if (result.recommendations && result.recommendations.length > 0) {
      const checkResult = this.incompatibilityService.checkRoutine(result.recommendations);
      (result as any).compatibilityWarning = checkResult.message;
    }

    return result;
  }

  /**
   * Analyse unifiée utilisant le LLM
   */
  async analyzeSkinWithLLM(
    profile: UserSkinProfile,
    userId: string = ''
  ): Promise<GlobalScoreResult & { recommendations?: any[] }> {
    try {
      // LIMIT CHECK (DEV 4)
      let plan = 'FREE';
      if (userId) {
        const sub = await this.subscriptionService.getSubscription(userId);
        plan = sub.plan;
        
        const { allowed } = await this.subscriptionService.checkAnalysisLimit(userId);
        if (!allowed) {
          throw new Error('LIMIT_REACHED');
        }
      }
      
      const result = await this.openRouterService.analyzeSkin(profile, plan) as any;

      const hasPhoto = Boolean(profile.imageBase64);
      const aiWeight = hasPhoto ? 0.7 : 0;
      const userWeight = hasPhoto ? 0.3 : 1;
      const combinedInsights: Record<string, {
        aiScore: number | null;
        userScore?: number;
        combinedScore: number;
        weight: { ai: number; user: number };
      }> = {};

      const conditionMap: Array<{ field: keyof UserSkinProfile; condition: SkinCondition }> = [
        { field: 'acneLevel', condition: SkinCondition.ACNE },
        { field: 'blackheadsLevel', condition: SkinCondition.BLACKHEADS },
        { field: 'poreSize', condition: SkinCondition.PORES },
        { field: 'rednessLevel', condition: SkinCondition.REDNESS },
        { field: 'hydrationLevel', condition: SkinCondition.HYDRATION },
        { field: 'wrinklesDepth', condition: SkinCondition.WRINKLES },
      ];

      const toGoodScore = (condition: SkinCondition, rawScore?: number): number => {
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
      };

      // Ensure conditionScores array exists
      if (!result.conditionScores) {
        result.conditionScores = [];
      }

      conditionMap.forEach(({ field, condition }) => {
        const userScore = profile[field];
        let conditionEntry = result.conditionScores.find((c: any) => c.type === condition);
        
        // Create if doesn't exist
        if (!conditionEntry) {
          conditionEntry = { type: condition, score: 50, severity: 0.5 };
          result.conditionScores.push(conditionEntry);
        }

        const aiScore = hasPhoto ? (conditionEntry?.score ?? null) : null;

        if (conditionEntry) {
          const numericUserScore = typeof userScore === 'number' ? userScore : undefined;
          const baseUser = toGoodScore(condition, numericUserScore);
          const combinedScore = hasPhoto
            ? Math.round((aiScore ?? 0) * aiWeight + baseUser * userWeight)
            : baseUser;

          conditionEntry.score = combinedScore;
          conditionEntry.severity = Math.max(0, Math.min(1, 1 - combinedScore / 100));
          combinedInsights[condition] = {
            aiScore,
            userScore: typeof userScore === 'number' ? userScore : undefined,
            combinedScore,
            weight: { ai: aiWeight, user: userWeight },
          };
        }
      });

      if (result.conditionScores?.length) {
        const averaged = result.conditionScores.reduce((sum: number, c: any) => sum + (c.score ?? 0), 0) / result.conditionScores.length;
        result.globalScore = Math.round(averaged * 10) / 10;
      }

      console.log(`[analyzeSkinWithLLM] Generated condition scores:`, result.conditionScores?.map(c => ({ type: c.type, score: c.score })));

      if (result.conditionScores?.length) {
        const sorted = [...result.conditionScores].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
        result.analysis = {
          bestCondition: sorted[0]?.type ?? null,
          worstCondition: sorted[sorted.length - 1]?.type ?? null,
          dominantCondition: sorted[sorted.length - 1]?.type ?? null,
        } as any;
      }

      result.metaWeighting = { aiWeight, userWeight } as any;
      result.userInputs = {
        acneLevel: profile.acneLevel,
        blackheadsLevel: profile.blackheadsLevel,
        poreSize: profile.poreSize,
        wrinklesDepth: profile.wrinklesDepth,
        sensitivityLevel: profile.sensitivityLevel,
        hydrationLevel: profile.hydrationLevel,
        rednessLevel: profile.rednessLevel,
      } as any;
      result.combinedInsights = combinedInsights as any;

      if (userId && result.globalScore > 0) {
        const saved = await this.persistResult(result, 'unified_llm', userId, profile.age);
        if (saved && (saved as any).recommendations) {
          result.recommendations = (saved as any).recommendations;
        }
      } 
      
      // Toujours ajouter des recommandations même si pas de userId (pour le démo/guest mode)
      if (!result.recommendations) {
        result.recommendations = await this.recommendationService.getRecommendationsForSkinState(
          userId || 'guest',
          'temporary',
          profile.skinType || 'Normal'
        );
      }

      if (result.recommendations && result.recommendations.length > 0) {
        const checkResult = this.incompatibilityService.checkRoutine(result.recommendations);
        (result as any).compatibilityWarning = checkResult.message;
      }

      // INCREMENT USAGE (DEV 4)
      if (userId) {
        await this.subscriptionService.incrementImages(userId);
      }

      return result;
    } catch (error) {
      throw new Error(`LLM Analysis failed: ${error.message}`);
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
    return Math.round(50 + Math.random() * 30);
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
    const def = () => AiAnalysisService.defaultMetricValue();
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
      
      // CRITICAL: Use ONLY the age provided by user during analysis
      // NO fallback to birthDate - keep realAge exactly as provided
      const realAge: number | null = userInputAge ?? null;
      
      // Calculate skinAge using realAge as reference point
      // Higher score -> lower skinAge; lower score -> higher skinAge
      const baselineAge = realAge ?? 25;
      const normalizedScore = Math.max(0, Math.min(100, result.globalScore ?? 0));
      const ageAdjustment = (50 - normalizedScore) / 5; // Range: -10 (score=100) to +10 (score=0)
      const skinAge = Math.round(baselineAge + ageAdjustment);

      if (!realAge) {
        console.warn(`⚠️ No age provided in analysis. Using null for realAge. This may affect insights calculations.`);
      }

      console.log(`[persistResult] Saving analysis - realAge: ${realAge}, baselineAge: ${baselineAge}, globalScore: ${result.globalScore}, skinAge: ${skinAge}`);

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
      }) as SkinAnalysis;

      const savedAnalysis: SkinAnalysis = await this.analysisRepo.save(analysis);

      console.log(`[persistResult] Saved analysis with metrics - acne: ${savedAnalysis.acne}, oil: ${savedAnalysis.oil}, hydration: ${savedAnalysis.hydration}, wrinkles: ${savedAnalysis.wrinkles}`);

      const metrics = result.conditionScores.map(condition => (
        this.metricRepo.create({
          analysisId: savedAnalysis.id,
          metricType: condition.type,
          score: condition.score ?? AiAnalysisService.defaultMetricValue(),
          severityLevel: `Severity ${(condition.severity ?? 0).toFixed(1)}`,
        })
      ));

      await this.metricRepo.save(metrics);

      // ✅ NOUVEAU: Générer des recommandations basées sur l'état de la peau
      let inferredSkinType = 'Normal';
      const dominant = result.analysis?.dominantCondition;
      
      if (dominant === SkinCondition.ACNE || dominant === SkinCondition.PORES) {
        inferredSkinType = 'Oily';
      } else if (dominant === SkinCondition.REDNESS) {
        inferredSkinType = 'Sensitive';
      } else if (result.globalScore < 40) {
        inferredSkinType = 'Dry';
      }

      const recommendations = await this.recommendationService.getRecommendationsForSkinState(
        userId,
        savedAnalysis.id,
        inferredSkinType
      );

      console.log(`✅ Analyse + Recommandations sauvegardées pour userId=${userId}, id=${savedAnalysis.id}`);
      return { ...savedAnalysis, recommendations };
    } catch (error) {
      console.error('❌ Failed to persist AI analysis:', error.message);
      return null;
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