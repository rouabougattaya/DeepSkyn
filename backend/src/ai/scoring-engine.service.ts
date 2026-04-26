import { Injectable } from '@nestjs/common';
import { SkinMetric, ConditionScore, ConditionWeights, GlobalScoreResult } from './detection.interface';
import { SkinCondition } from './skin-condition.enum';

@Injectable()
export class ScoringEngineService {
  
  /**
   * Poids par défaut pour chaque condition
   */
  private readonly defaultWeights: ConditionWeights = {
    acne: 25,        // Acné - impact élevé
    pores: 15,        // Pores - impact modéré
    scars: 20,        // Cicatrices - impact élevé
    redness: 15,      // Rougeurs - impact modéré
    blackheads: 10,   // Points noirs - impact faible
    darkSpots: 10,    // Taches brunes - impact faible
    blackDots: 5,     // Points noirs - impact très faible
    hydration: 10,    // Hydratation - impact modéré
    wrinkles: 15,     // Rides - impact élevé
  };

  /**
   * Convertit les métriques en scores de condition (0-100)
   * Plus il y a de détections = plus c'est mauvais (logique inverse)
   */
  computeConditionScores(metrics: SkinMetric[]): ConditionScore[] {
    return metrics.map(metric => ({
      type: metric.type,
      score: this.computeConditionScore(metric),
      count: metric.count,
      severity: metric.severity,
    }));
  }

  /**
   * Calcule le score pour une condition spécifique (0-100)
   * 100 = parfait, 0 = très mauvais
   */
  private computeConditionScore(metric: SkinMetric): number {
    // Facteur de densité (nombre de détections)
    const densityFactor = Math.min(metric.count / this.getMaxExpectedCount(metric.type), 1);
    
    // Facteur de sévérité (confiance moyenne)
    const severityFactor = metric.severity;
    
    // Score composite (pondéré)
    const rawScore = (densityFactor * 0.6) + (severityFactor * 0.4);
    
    // Inversion: plus de détections = score plus bas
    const normalizedScore = 100 - (rawScore * 100);
    
    return Math.max(0, Math.min(100, Math.round(normalizedScore * 100) / 100));
  }

  /**
   * Retourne le nombre maximum attendu de détections par condition
   */
  private getMaxExpectedCount(condition: SkinCondition): number {
    const maxCounts: Record<SkinCondition, number> = {
      [SkinCondition.ACNE]: 15,           // Max 15 boutons
      [SkinCondition.PORES]: 30,          // Max 30 zones de pores
      [SkinCondition.SCARS]: 10,           // Max 10 cicatrices
      [SkinCondition.REDNESS]: 5,          // Max 5 zones de rougeur
      [SkinCondition.BLACKHEADS]: 20,      // Max 20 points noirs
      [SkinCondition.DARK_SPOTS]: 15,      // Max 15 taches
      [SkinCondition.BLACK_DOTS]: 25,      // Max 25 points noirs
      [SkinCondition.HYDRATION]: 20,       // Max 20 zones de deshydratation
      [SkinCondition.WRINKLES]: 15,        // Max 15 zones de rides
    };

    return maxCounts[condition] || 10;
  }

  /**
   * Calcule le score global composite
   */
  calculateGlobalScore(
    conditionScores: ConditionScore[], 
    customWeights?: Partial<ConditionWeights>
  ): GlobalScoreResult {
    const weights = { ...this.defaultWeights, ...customWeights };
    
    // Normaliser les poids pour qu'ils somment à 100
    const normalizedWeights = this.normalizeWeights(weights);
    
    // Calcul du score global pondéré
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const conditionScore of conditionScores) {
      const weight = this.getWeightForCondition(conditionScore.type, normalizedWeights);
      const scoreValue = typeof conditionScore.score === 'number' ? conditionScore.score : 0;
      totalScore += scoreValue * weight;
      totalWeight += weight;
    }
    
    const globalScore = totalWeight > 0 ? totalScore / totalWeight : 100;
    
    // Analyse des résultats
    const analysis = this.analyzeResults(conditionScores);
    
    return {
      globalScore: Math.round(globalScore * 100) / 100,
      conditionScores,
      totalDetections: conditionScores.reduce((sum, cs) => sum + cs.count, 0),
      analysis,
    };
  }

  /**
   * Normalise les poids pour qu'ils somment à 100
   */
  private normalizeWeights(weights: ConditionWeights): ConditionWeights {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (total === 0) return this.defaultWeights;
    
    return {
      acne: (weights.acne / total) * 100,
      pores: (weights.pores / total) * 100,
      scars: (weights.scars / total) * 100,
      redness: (weights.redness / total) * 100,
      blackheads: (weights.blackheads / total) * 100,
      darkSpots: (weights.darkSpots / total) * 100,
      blackDots: (weights.blackDots / total) * 100,
      hydration: (weights.hydration / total) * 100,
      wrinkles: (weights.wrinkles / total) * 100,
    };
  }

  /**
   * Récupère le poids pour une condition spécifique
   */
  private getWeightForCondition(condition: SkinCondition, weights: ConditionWeights): number {
    const weightMap: Record<SkinCondition, keyof ConditionWeights> = {
      [SkinCondition.ACNE]: 'acne',
      [SkinCondition.PORES]: 'pores',
      [SkinCondition.SCARS]: 'scars',
      [SkinCondition.REDNESS]: 'redness',
      [SkinCondition.BLACKHEADS]: 'blackheads',
      [SkinCondition.DARK_SPOTS]: 'darkSpots',
      [SkinCondition.BLACK_DOTS]: 'blackDots',
      [SkinCondition.HYDRATION]: 'hydration',
      [SkinCondition.WRINKLES]: 'wrinkles',
    };

    return weights[weightMap[condition]] || 0;
  }

  /**
   * Analyse les résultats pour identifier les conditions importantes
   */
  private analyzeResults(conditionScores: ConditionScore[]) {
    if (conditionScores.length === 0) {
      return {
        bestCondition: null,
        worstCondition: null,
        dominantCondition: null,
      };
    }

    // Meilleure condition (score le plus élevé)
    const bestCondition = conditionScores.reduce((best, current) => {
      const currentScore = typeof current.score === 'number' ? current.score : Number.NEGATIVE_INFINITY;
      const bestScore = typeof best.score === 'number' ? best.score : Number.NEGATIVE_INFINITY;
      return currentScore > bestScore ? current : best;
    }).type;

    // Pire condition (score le plus bas)
    const worstCondition = conditionScores.reduce((worst, current) => {
      const currentScore = typeof current.score === 'number' ? current.score : Number.POSITIVE_INFINITY;
      const worstScore = typeof worst.score === 'number' ? worst.score : Number.POSITIVE_INFINITY;
      return currentScore < worstScore ? current : worst;
    }).type;

    // Condition dominante (plus de détections)
    const dominantCondition = conditionScores.reduce((dominant, current) => 
      current.count > dominant.count ? current : dominant
    ).type;

    return {
      bestCondition,
      worstCondition,
      dominantCondition,
    };
  }

  /**
   * Retourne les poids par défaut
   */
  getDefaultWeights(): ConditionWeights {
    return { ...this.defaultWeights };
  }

  /**
   * Valide les poids personnalisés
   */
  validateWeights(weights: Partial<ConditionWeights>): boolean {
    const weightValues = Object.values(weights);
    
    // Vérifie que tous les poids sont des nombres positifs
    if (weightValues.some(w => typeof w !== 'number' || w < 0)) {
      return false;
    }
    
    // Vérifie qu'au moins un poids est > 0
    if (weightValues.every(w => w === 0)) {
      return false;
    }
    
    return true;
  }
}
