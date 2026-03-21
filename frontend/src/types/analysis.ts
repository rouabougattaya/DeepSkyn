export interface SkinMetric {
  id: string;
  analysisId: string;
  metricType: string;
  score: number;
  severityLevel: string;
}

export interface SkinAnalysis {
  id: string;
  skinScore: number;
  createdAt: string;
  metrics?: SkinMetric[];
}
