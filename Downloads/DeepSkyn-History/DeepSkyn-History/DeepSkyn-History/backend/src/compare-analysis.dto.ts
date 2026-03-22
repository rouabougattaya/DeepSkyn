/**
 * DTO for GET /analysis/compare?firstId=&secondId=
 */
export interface CompareAnalysisQueryDto {
  firstId: string;
  secondId: string;
}

export type MetricKey = 'hydration' | 'oil' | 'acne' | 'wrinkles';

export interface AnalysisMetricsView {
  hydration: number;
  oil: number;
  acne: number;
  wrinkles: number;
}

export interface MetricDifference {
  metric: MetricKey;
  firstValue: number;
  secondValue: number;
  delta: number;
  trend: 'improvement' | 'regression' | 'stable';
}

export interface CompareAnalysisResultDto {
  first: {
    id: string;
    skinScore: number;
    skinAge: number | null;
    realAge: number | null;
    createdAt: string;
    metrics: AnalysisMetricsView;
    summary: string | null;
  };
  second: {
    id: string;
    skinScore: number;
    skinAge: number | null;
    realAge: number | null;
    createdAt: string;
    metrics: AnalysisMetricsView;
    summary: string | null;
  };
  differences: MetricDifference[];
  globalTrend: 'improvement' | 'regression' | 'stable';
  summaryText: string;
  /** True when both analyses have no metric data (all 0 or missing). */
  metricsMissing?: boolean;
  /** Message to display when metrics are missing (e.g. for frontend). */
  metricsMessage?: string;
}
