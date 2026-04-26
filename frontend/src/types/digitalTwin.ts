export interface PredictionMetrics {
  hydration: number;
  oil: number;
  acne: number;
  wrinkles: number;
}

export interface MonthPrediction {
  skinScore: number;
  skinAge: number;
  metrics: PredictionMetrics;
  improvements: string[];
  degradations: string[];
  summary: string;
}

export interface SimulationContext {
  routineConsistency: 'high' | 'medium' | 'low';
  lifestyleFactors: string[];
  currentSkinType: string;
  mainConcerns: string[];
}

export interface CreateDigitalTwinDto {
  baseAnalysisId: string;
  routineConsistency?: 'high' | 'medium' | 'low';
  lifestyleFactors?: string[];
}

export interface DigitalTwinResponseDto {
  id: string;
  userId: string;
  baseAnalysisId: string;
  month1Prediction: MonthPrediction;
  month3Prediction: MonthPrediction;
  month6Prediction: MonthPrediction;
  simulationContext: SimulationContext;
  overallRecommendation: string;
  createdAt: Date;
}

export interface DigitalTwinTimelineDto {
  currentState: {
    skinScore: number;
    skinAge: number;
    metrics: PredictionMetrics;
    createdAt: Date;
  };
  predictions: {
    month1: MonthPrediction;
    month3: MonthPrediction;
    month6: MonthPrediction;
  };
  trends: {
    bestOutcome: 'month1' | 'month3' | 'month6';
    worstOutcome: 'month1' | 'month3' | 'month6';
    overallTrajectory: 'improvement' | 'degradation' | 'stable';
  };
}
