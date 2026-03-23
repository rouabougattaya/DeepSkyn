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
import { RecommendationService } from '../recommendation/recommendation.service';
import { SkinCondition } from './skin-condition.enum';

@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly fakeAiService: FakeAiService,
    private readonly detectionAdapter: DetectionAdapterService,
    private readonly scoringEngine: ScoringEngineService,
    private readonly openRouterService: OpenRouterService,
    private readonly recommendationService: RecommendationService,
    @InjectRepository(SkinAnalysis)
    private readonly analysisRepo: Repository<SkinAnalysis>,
    @InjectRepository(SkinMetric)
    private readonly metricRepo: Repository<SkinMetric>,
  ) { }

  /**
   * Analyse complète d'une image
   * Flow: IA → Adapter → Scoring Engine → Résultat
   */
  async analyzeImage(
    imageId?: string,
    customWeights?: Partial<ConditionWeights>,
    testType?: 'severe' | 'mild' | 'mixed',
    userId: string = ''
  ): Promise<GlobalScoreResult & { recommendations?: any[] }> {
    try {
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
        const saved = await this.persistResult(result, imageId || 'test_scenario', userId);
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
    userId: string = ''
  ): Promise<GlobalScoreResult> {
    const rawDetections = this.fakeAiService.generateRandomDetections(seed);

    const metrics = this.detectionAdapter.aggregateDetections(rawDetections);
    const conditionScores = this.scoringEngine.computeConditionScores(metrics);
    const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights) as any;

    if (userId && result.globalScore > 0) {
      const saved = await this.persistResult(result, `seed_${seed || 'rand'}`, userId);
      if (saved && (saved as any).recommendations) {
        result.recommendations = (saved as any).recommendations;
      }
    } else {
      console.warn('⚠️ userId manquant, analyse aléatoire non sauvegardée');
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
      const result = await this.openRouterService.analyzeSkin(profile) as any;

      if (userId && result.globalScore > 0) {
        const saved = await this.persistResult(result, 'unified_llm', userId);
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
    const findScore = (type: string) =>
      conditionScores.find(c => String(c.type).toLowerCase() === type.toLowerCase())?.score;
    const def = () => AiAnalysisService.defaultMetricValue();
    return {
      hydration: findScore('hydration') ?? def(),
      oil: findScore('enlarged-pores') ?? findScore('oil') ?? def(),
      acne: findScore('acne') ?? def(),
      wrinkles: findScore('wrinkles') ?? def(),
    };
  }

  /**
   * Sauvegarde les résultats en base de données.
   */
  private async persistResult(result: GlobalScoreResult, imageId: string, userId: string) {
    if (!userId) {
      console.error('❌ userId manquant, analyse non sauvegardée');
      return null;
    }

    try {
      const comparisonMetrics = this.getComparisonMetricsFromConditions(result.conditionScores);
      const skinAge = Math.round(25 + (100 - (result.globalScore ?? 0)) / 4);

      const analysis = this.analysisRepo.create({
        userId,
        status: 'COMPLETED',
        skinScore: result.globalScore ?? 0,
        skinAge,
        summary: `Analyse multi-critères réalisée. Score global: ${(result.globalScore ?? 0).toFixed(1)}/100.`,
        aiRawResponse: { imageId, timestamp: new Date().toISOString() },
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
}