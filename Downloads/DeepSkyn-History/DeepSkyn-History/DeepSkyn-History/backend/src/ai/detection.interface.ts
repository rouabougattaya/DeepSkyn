import { SkinCondition } from './skin-condition.enum';

export interface RawDetection {
  class: string;
  confidence: number;
  bbox: number[];
}

export interface SkinMetric {
  type: SkinCondition;
  count: number;
  severity: number;
  averageConfidence: number;
}

export interface ConditionScore {
  type: SkinCondition;
  score: number;
  count: number;
  severity: number;
}

export interface ConditionWeights {
  acne: number;
  pores: number;
  scars: number;
  redness: number;
  blackheads: number;
  darkSpots: number;
  blackDots: number;
}

export interface GlobalScoreResult {
  globalScore: number;
  conditionScores: ConditionScore[];
  totalDetections: number;
  analysis: {
    bestCondition: SkinCondition | null;
    worstCondition: SkinCondition | null;
    dominantCondition: SkinCondition | null;
  };
}
