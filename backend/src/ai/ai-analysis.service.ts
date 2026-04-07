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

      console.log(`[analyzeSkinWithLLM] Starting analysis for userId: ${userId}, skinType: ${profile.skinType}`);
      const result = await this.openRouterService.analyzeSkin(profile, plan) as any;

      const hasPhoto = Boolean(profile.imageBase64 || (profile.imagesBase64 && profile.imagesBase64.length > 0));
      // True image-first behavior: when a photo exists, scores must come from image detection.
      const aiWeight = hasPhoto ? 1 : 0;
      const userWeight = hasPhoto ? 0 : 1;
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
        const numericUserScore = typeof userScore === 'number' ? userScore : undefined;
        const aiEvaluated = hasPhoto && conditionEntry && conditionEntry.evaluated !== false && typeof conditionEntry.score === 'number';
        const userDeclared = typeof numericUserScore === 'number';
        const shouldEvaluate = hasPhoto ? Boolean(aiEvaluated) : userDeclared;

        // Create explicit "non evaluated" entry if absent
        if (!conditionEntry) {
          conditionEntry = {
            type: condition,
            score: null,
            count: 0,
            severity: null,
            evaluated: false,
            notEvaluatedReason: 'Ni detecte sur image, ni renseigne par utilisateur',
          };
          result.conditionScores.push(conditionEntry);
        }

        if (!shouldEvaluate) {
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
          return;
        }

        const aiScore = aiEvaluated ? (conditionEntry?.score ?? null) : null;
        const baseUser = typeof numericUserScore === 'number' ? toGoodScore(condition, numericUserScore) : null;
        const combinedScore =
          typeof aiScore === 'number' && typeof baseUser === 'number'
            ? Math.round(aiScore * aiWeight + baseUser * userWeight)
            : typeof aiScore === 'number'
              ? aiScore
              : (baseUser as number);

        conditionEntry.evaluated = true;
        conditionEntry.notEvaluatedReason = null;
        conditionEntry.score = combinedScore;
        conditionEntry.severity = Math.max(0, Math.min(1, 1 - combinedScore / 100));
        conditionEntry.count = conditionEntry.count ?? 0;
        combinedInsights[condition] = {
          aiScore,
          userScore: typeof numericUserScore === 'number' ? numericUserScore : undefined,
          combinedScore,
          weight: { ai: aiWeight, user: userWeight },
        };
      });

      const evaluatedConditionScores = (result.conditionScores || []).filter(
        (c: any) => c.evaluated !== false && typeof c.score === 'number',
      );

      if (evaluatedConditionScores.length) {
        const averaged = evaluatedConditionScores.reduce((sum: number, c: any) => sum + (c.score ?? 0), 0) / evaluatedConditionScores.length;
        result.globalScore = Math.round(averaged * 10) / 10;
      } else {
        result.globalScore = 0;
      }

      console.log(`[analyzeSkinWithLLM] Generated condition scores:`, result.conditionScores?.map(c => ({ type: c.type, score: c.score })));

      if (evaluatedConditionScores.length) {
        const sorted = [...evaluatedConditionScores].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
        result.analysis = {
          bestCondition: sorted[0]?.type ?? null,
          worstCondition: sorted[sorted.length - 1]?.type ?? null,
          dominantCondition: sorted[sorted.length - 1]?.type ?? null,
        } as any;
      } else {
        result.analysis = {
          bestCondition: null,
          worstCondition: null,
          dominantCondition: null,
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

      // Fill IA skin age estimation
      if (typeof profile.age === 'number') {
        try {
          // If we have photos, we can try to estimate skin age via LLM
          if (hasPhoto) {
            const agePrediction = await this.openRouterService.estimateSkinAge(profile);
            if (Number.isFinite(agePrediction.skinAge)) {
              result.skinAge = Math.round(agePrediction.skinAge);
            }
            if (typeof agePrediction.rationale === 'string' && agePrediction.rationale.trim()) {
              result.skinAgeRationale = agePrediction.rationale.trim();
            }
          }

          // Fallback or adjustment if skinAge is still missing or not estimated by photo
          if (result.skinAge === undefined || result.skinAge === null) {
            const baselineAge = profile.age;
            const normalizedScore = Math.max(0, Math.min(100, result.globalScore ?? 0));
            const ageAdjustment = (50 - normalizedScore) / 5;
            result.skinAge = Math.round(baselineAge + ageAdjustment);
            if (!result.skinAgeRationale) {
              result.skinAgeRationale = `Age estimé basé sur un score global de ${result.globalScore}/100 et un âge réel de ${profile.age} ans.`;
            }
          }
        } catch (e: any) {
          console.warn(`[analyzeSkinWithLLM] Skin age estimation error: ${e?.message || e}`);
          const baselineAge = profile.age;
          const normalizedScore = Math.max(0, Math.min(100, result.globalScore ?? 0));
          const ageAdjustment = (50 - normalizedScore) / 5;
          result.skinAge = Math.round(baselineAge + ageAdjustment);
        }
      }

      if (userId && result.globalScore > 0) {
        const saved = await this.persistResult(result, 'unified_llm', userId, profile.age);
        if (saved && (saved as any).recommendations) {
          result.recommendations = (saved as any).recommendations;
        }
      }

      // Toujours ajouter des recommandations même si pas de userId (pour le démo/guest mode)
      if (!result.recommendations) {
        const conditionToConcern = (type: string): string => {
          const normalized = String(type || '').toLowerCase();
          if (normalized === 'acne') return 'acne';
          if (normalized === 'blackheads') return 'blackheads';
          if (normalized === 'enlarged-pores') return 'pores';
          if (normalized === 'skin redness') return 'redness';
          if (normalized === 'hydration') return 'dryness'; // Correction: l'IA cherche 'dryness' pour l'hydratation
          if (normalized === 'wrinkles') return 'wrinkles';
          if (normalized === 'dark-spots') return 'dark_spots'; // Correction: le script python utilise dark_spots avec '_'
          if (normalized === 'black_dots') return 'blackheads';
          return normalized;
        };
        const evaluatedConcerns: string[] = Array.from(
          new Set<string>(
            evaluatedConditionScores
              .map((c: any) => conditionToConcern(c.type))
              .filter((c): c is string => typeof c === 'string' && c.length > 0),
          ),
        );
        result.recommendations = await this.recommendationService.getRecommendationsForSkinState(
          userId || 'guest',
          'temporary',
          profile.skinType || 'Normal',
          evaluatedConcerns,
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
          score: condition.evaluated === false ? 0 : (condition.score ?? AiAnalysisService.defaultMetricValue()),
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