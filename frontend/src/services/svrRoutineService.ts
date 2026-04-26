import { apiPost } from './apiClient';

export interface SvrProductInStep {
  name: string;
  category: string;
  description: string;
  price: number;
  url: string;
  imageUrl?: string;
  keyIngredients: string[];
}

export interface SvrRecommendedProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  url: string;
  imageUrl?: string;
  keyIngredients: string[];
  reason: string;
  skinBenefit: string;
  texture?: string;
  score: number;
}

export interface SvrRoutineStep {
  stepOrder: number;
  stepName: string;
  product: SvrProductInStep;
  instruction: string;
  reason: string;
}

export interface SvrRoutineResult {
  recommendedProducts: SvrRecommendedProduct[];
  morning: SvrRoutineStep[];
  night: SvrRoutineStep[];
  skinProfile: string;
  generalAdvice: string;
}

export const svrRoutineService = {
  async generateRoutine(profile: {
    skinType: string;
    age: number;
    gender?: string;
    concerns?: string[];
    acneLevel?: number;
    blackheadsLevel?: number;
    poreSize?: number;
    wrinklesDepth?: number;
    hydrationLevel?: number;
    rednessLevel?: number;
    sensitivityLevel?: number;
    forceRegenerate?: boolean;
    seed?: number;
  }): Promise<SvrRoutineResult> {
    const { forceRegenerate, seed, ...bodyProfile } = profile;
    const queryParams = new URLSearchParams();
    if (forceRegenerate) queryParams.append('forceRegenerate', 'true');
    if (seed) queryParams.append('seed', seed.toString());
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const data = await apiPost<{ success: boolean; data: SvrRoutineResult }>(
      `/ai/svr-routine${queryString}`,
      bodyProfile
    );
    return data.data;
  },
};
