import { apiGet, apiPost } from './apiClient';
import type { GlobalScoreResult, ConditionWeights, UserSkinProfile } from '../types/aiAnalysis';

export const aiAnalysisService = {
  async analyzeImage(
    imageId?: string,
    weights?: Partial<ConditionWeights>,
    testType?: 'severe' | 'mild' | 'mixed',
    age?: number
  ): Promise<GlobalScoreResult> {
    const data = await apiPost<{ success: boolean; data: GlobalScoreResult }>('/ai/analyze', {
      imageId, weights, testType, age
    });
    return data.data;
  },

  async analyzeRandom(
    seed?: number,
    weights?: Partial<ConditionWeights>,
    age?: number
  ): Promise<{ result: GlobalScoreResult; seed: number }> {
    const params = new URLSearchParams();
    if (seed !== undefined) params.append('seed', seed.toString());
    if (weights) params.append('weights', JSON.stringify(weights));
    if (age !== undefined) params.append('age', age.toString());
    const query = params.toString() ? `?${params}` : '';
    const data = await apiGet<{ success: boolean; data: GlobalScoreResult; seed: number }>(
      `/ai/analyze/random${query}`
    );
    return { result: data.data, seed: data.seed };
  },

  async analyzeTestCase(
    testType: 'severe' | 'mild' | 'mixed',
    weights?: Partial<ConditionWeights>,
    age?: number
  ): Promise<GlobalScoreResult> {
    const params = new URLSearchParams();
    if (weights) params.append('weights', JSON.stringify(weights));
    if (age !== undefined) params.append('age', age.toString());
    const query = params.toString() ? `?${params}` : '';
    const data = await apiGet<{ success: boolean; data: GlobalScoreResult }>(
      `/ai/analyze/test/${testType}${query}`
    );
    return data.data;
  },

  async getDefaultWeights(): Promise<ConditionWeights> {
    const data = await apiGet<{ success: boolean; data: ConditionWeights }>('/ai/weights/default');
    return data.data;
  },

  async validateWeights(weights: Partial<ConditionWeights>): Promise<{
    isValid: boolean;
    weights: Partial<ConditionWeights>;
  }> {
    const data = await apiPost<{ success: boolean; data: any }>('/ai/weights/validate', weights);
    return data.data;
  },

  async analyzeUnified(profile: UserSkinProfile): Promise<GlobalScoreResult> {
    const data = await apiPost<{ success: boolean; data: GlobalScoreResult }>('/ai/analyze/unified', profile);
    return data.data;
  },
};
