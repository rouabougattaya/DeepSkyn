import { apiPost } from './apiClient';

export interface SvrProductInStep {
  name: string;
  category: string;
  description: string;
  price: number;
  url: string;
  keyIngredients: string[];
}

export interface SvrRecommendedProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  url: string;
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
  }): Promise<SvrRoutineResult> {
    const data = await apiPost<{ success: boolean; data: SvrRoutineResult }>(
      '/ai/svr-routine',
      profile
    );
    return data.data;
  },
};
