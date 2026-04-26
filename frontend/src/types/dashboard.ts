export interface DashboardMetrics {
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalAnalyses: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
  standardDeviation: number;
  medianScore: number;
  percentile25: number;
  percentile75: number;
  movingAverage5: number;
  latestAnalysisId?: string;
}

export interface MonthlyData {
  month: string;
  averageScore: number;
  analysisCount: number;
  bestScore: number;
  worstScore: number;
  standardDeviation: number;
  changePercent?: number;
}

export interface TrendData {
  period: string;
  current: number;
  previous: number;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  label: string;
  sampleSize: number;
}
