import { apiGet, apiPost } from './apiClient';
import type { SkinAnalysis } from '../types/analysis';

export interface Weights {
  hydration: number;
  oil: number;
  acne: number;
  wrinkles: number;
}

export interface Insight {
  type: 'stagnation' | 'improvement' | 'fluctuation' | 'info';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export const analysisService = {
  async getAnalysisById(analysisId: string): Promise<SkinAnalysis> {
    return apiGet<SkinAnalysis>(`/analysis/${analysisId}`);
  },

  async recalculateScore(analysisId: string, weights: Weights) {
    return apiPost<{ id: string; skinScore: number }>(
      `/analysis/recalculate/${analysisId}`,
      weights
    );
  },

  async getInsights(): Promise<Insight[]> {
    return apiGet<Insight[]>('/analysis/insights');
  },
};

/** Convenience function — kept for backward compatibility */
export async function recalculateAnalysisScore(analysisId: string, weights: Weights) {
  return analysisService.recalculateScore(analysisId, weights);
}
