import { Injectable } from '@nestjs/common';
import { FakeAiService } from './fake-ai.service';
import { DetectionAdapterService } from './detection-adapter.service';
import { ScoringEngineService } from './scoring-engine.service';
import { RawDetection, GlobalScoreResult, ConditionWeights } from './detection.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';

@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly fakeAiService: FakeAiService,
    private readonly detectionAdapter: DetectionAdapterService,
    private readonly scoringEngine: ScoringEngineService,
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
    userId: string = '' // We will enforce this in the service call from controller
  ): Promise<GlobalScoreResult> {
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

      // Étape 5: Calcul du score global
      const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights);

      // Étape 6: Sauvegarde uniquement si userId est présent
      if (userId && (imageId || testType || result.globalScore > 0)) {
        await this.persistResult(result, imageId || 'test_scenario', userId);
      } else {
        console.warn('⚠️ userId manquant, analyse non sauvegardée');
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
    const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights);

    if (userId && result.globalScore > 0) {
      await this.persistResult(result, `seed_${seed || 'rand'}`, userId);
    } else {
      console.warn('⚠️ userId manquant, analyse aléatoire non sauvegardée');
    }

    return result;
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
   * Utilise ?? pour éviter les NULL ; défaut 50–80 si une métrique manque.
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
   * Remplit hydration, oil, acne, wrinkles sur SkinAnalysis pour la comparaison (évite NULL).
   */
  private async persistResult(result: GlobalScoreResult, imageId: string, userId: string) {
    if (!userId) {
      console.error('❌ userId manquant, analyse non sauvegardée');
      return null;
    }

    try {
      const comparisonMetrics = this.getComparisonMetricsFromConditions(result.conditionScores);

      const analysis = this.analysisRepo.create({
        userId,
        status: 'COMPLETED',
        skinScore: result.globalScore ?? 0,
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
      console.log(`✅ Analyse sauvegardée pour userId=${userId}, id=${savedAnalysis.id}`);
      return savedAnalysis;
    } catch (error) {
      console.error('❌ Failed to persist AI analysis:', error.message);
      return null;
    }
  }
}