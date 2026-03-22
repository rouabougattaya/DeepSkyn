import { SkinCondition } from './skin-condition.enum';

export interface RawDetection {
  class: string;
  confidence: number;
  bbox: number[];
}

export interface SkinMetric {
  type: SkinCondition;
  count: number;
  severity: number;
  averageConfidence: number;
}

export interface ConditionScore {
  type: SkinCondition;
  score: number;
  count: number;
  severity: number;
}

export interface ConditionWeights {
  acne: number;
  pores: number;
  scars: number;
  redness: number;
  blackheads: number;
  darkSpots: number;
  blackDots: number;
}

export interface GlobalScoreResult {
  globalScore: number;
  conditionScores: ConditionScore[];
  totalDetections: number;
  analysis: {
    bestCondition: SkinCondition | null;
    worstCondition: SkinCondition | null;
    dominantCondition: SkinCondition | null;
  };
}

import { IsEnum, IsInt, IsArray, IsString, IsOptional, Min, Max } from 'class-validator';

export class UserSkinProfile {
  @IsEnum(['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'])
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal';

  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @IsEnum(['Male', 'Female', 'Other'])
  gender: 'Male' | 'Female' | 'Other';

  @IsArray()
  @IsString({ each: true })
  concerns: string[];

  @IsString()
  @IsOptional()
  imageBase64?: string;
}
