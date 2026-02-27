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
    userId?: string
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

      // Étape 6: Sauvegarde optionnelle
      if (imageId || testType || result.globalScore > 0) {
        await this.persistResult(result, imageId || 'test_scenario', userId);
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
    userId?: string
  ): Promise<GlobalScoreResult> {
    const rawDetections = this.fakeAiService.generateRandomDetections(seed);

    const metrics = this.detectionAdapter.aggregateDetections(rawDetections);
    const conditionScores = this.scoringEngine.computeConditionScores(metrics);
    const result = this.scoringEngine.calculateGlobalScore(conditionScores, customWeights);

    if (result.globalScore > 0) {
      await this.persistResult(result, `seed_${seed || 'rand'}`, userId);
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
   * Sauvegarde les résultats en base de données
   */
  private async persistResult(result: GlobalScoreResult, imageId: string, userId: string = 'demo-user') {
    try {
      // Créer l'entrée principale
      const analysis = this.analysisRepo.create({
        userId,
        status: 'COMPLETED',
        skinScore: result.globalScore,
        summary: `Analyse multi-critères réalisée. Score global: ${result.globalScore.toFixed(1)}/100.`,
        aiRawResponse: { imageId, timestamp: new Date().toISOString() },
      });

      const savedAnalysis = await this.analysisRepo.save(analysis);

      // Créer les métriques individuelles
      const metrics = result.conditionScores.map(condition => (
        this.metricRepo.create({
          analysisId: savedAnalysis.id,
          metricType: condition.type,
          score: condition.score,
          severityLevel: `Severity ${condition.severity.toFixed(1)}`,
        })
      ));

      await this.metricRepo.save(metrics);
      return savedAnalysis;
    } catch (error) {
      console.warn('Failed to persist AI analysis:', error.message);
      return null;
    }
  }
}
