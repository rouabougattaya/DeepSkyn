import { apiGet, apiPost } from './apiClient';
import type { SkinAnalysis } from '../types/analysis';

export interface Weights {
  hydration: number;
  oil: number;
  acne: number;
  wrinkles: number;
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
};

/** Convenience function — kept for backward compatibility */
export async function recalculateAnalysisScore(analysisId: string, weights: Weights) {
  return analysisService.recalculateScore(analysisId, weights);
}
