export interface DashboardMetrics {
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalAnalyses: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface MonthlyData {
  month: string;
  averageScore: number;
  analysisCount: number;
  bestScore: number;
  worstScore: number;
}

export interface TrendData {
  period: string;
  current: number;
  previous: number;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}
