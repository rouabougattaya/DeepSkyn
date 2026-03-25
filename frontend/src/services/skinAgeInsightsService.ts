import { apiGet } from './apiClient';
import type { Product } from './product.service';

export type SkinAgeStatus = 'younger' | 'aligned' | 'older' | 'unknown';

export interface SkinAgeInsightResponse {
  userId: string;
  status: SkinAgeStatus;
  delta: number | null;
  headline: string;
  advice: string[];
  productSuggestions: string[];
  latestAnalysis?: {
    id: string;
    createdAt: string;
    skinAge: number | null;
    realAge: number | null;
    skinScore: number | null;
  };
  trend?: {
    averageDelta: number | null;
    series: { createdAt: string; delta: number | null }[];
  };
  products?: Product[];
  userBenchmark: {
    sampleSize: number;
    avgDelta: number | null;
    avgSkinAge: number | null;
    avgRealAge: number | null;
  };
  datasetBenchmark: {
    sampleSize: number;
    avgDelta: number;
    avgSkinAge: number;
    avgRealAge: number;
  };
}

export const skinAgeInsightsService = {
  async getInsights(userId: string): Promise<SkinAgeInsightResponse> {
    return apiGet<SkinAgeInsightResponse>(`/skin-age/insights/${userId}`);
  },
};
