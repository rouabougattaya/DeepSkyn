/* ════════════════════════════════════════════════════════════
 *  Dashboard Types — Metrics Aggregation Engine (Dev 1 — Roua)
 * ════════════════════════════════════════════════════════════ */

export interface DashboardMetrics {
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalAnalyses: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
  /** Écart-type (dispersion des scores) */
  standardDeviation: number;
  /** Médiane */
  medianScore: number;
  /** 25ème percentile (Q1) */
  percentile25: number;
  /** 75ème percentile (Q3) */
  percentile75: number;
  /** Moyenne mobile 5 points */
  movingAverage5: number;
}

export interface MonthlyData {
  month: string;
  averageScore: number;
  analysisCount: number;
  bestScore: number;
  worstScore: number;
  standardDeviation: number;
  changePercent: number | null;
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
