/**
 * Service de comparaison d'analyses.
 * Les appels passent par apiClient qui ajoute automatiquement le JWT (Authorization: Bearer …)
 * pour les routes protégées comme GET /analysis/user.
 */
import { apiGet } from './apiClient';

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

export interface ComparedAnalysisItem {
  id: string;
  skinScore: number;
  skinAge: number | null;
  realAge: number | null;
  createdAt: string;
  metrics: AnalysisMetricsView;
  summary: string | null;
}

export interface CompareAnalysisResult {
  first: ComparedAnalysisItem;
  second: ComparedAnalysisItem;
  differences: MetricDifference[];
  globalTrend: 'improvement' | 'regression' | 'stable';
  summaryText: string;
  /** True when both analyses have no metric data (all 0 or missing). */
  metricsMissing?: boolean;
  /** Message to display when metrics are missing. */
  metricsMessage?: string;
}

export interface UserAnalysisItem {
  id: string;
  createdAt: string;
  skinScore: number;
}

export interface PaginatedAnalyses {
  data: UserAnalysisItem[];
  total: number;
}

export const comparisonService = {
  /** Liste des analyses de l'utilisateur connecté (tri par date décroissante). Token envoyé via apiClient. */
  async getUserAnalyses(page: number = 1, limit: number = 10): Promise<PaginatedAnalyses> {
    return apiGet<PaginatedAnalyses>(`/analysis/user?page=${page}&limit=${limit}`);
  },

  async compare(firstId: string, secondId: string): Promise<CompareAnalysisResult> {
    const params = new URLSearchParams({ firstId, secondId });
    return apiGet<CompareAnalysisResult>(`/analysis/compare?${params.toString()}`);
  },

  async getAnalysis(id: string): Promise<ComparedAnalysisItem> {
    return apiGet<ComparedAnalysisItem>(`/analysis/${id}`);
  },
};
