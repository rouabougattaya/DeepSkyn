import { SkinCondition } from './skin-condition.enum';
import { IsEnum, IsInt, IsArray, IsString, IsOptional, Min, Max } from 'class-validator';

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
  score: number | null;
  count: number;
  severity: number | null;
  evaluated?: boolean;
  notEvaluatedReason?: string | null;
}

export interface ConditionWeights {
  acne: number;
  pores: number;
  scars: number;
  redness: number;
  blackheads: number;
  darkSpots: number;
  blackDots: number;
  hydration: number;
  wrinkles: number;
}

export interface GlobalScoreResult {
  globalScore: number;
  conditionScores: ConditionScore[];
  totalDetections: number;
  skinAge?: number;
  skinAgeRationale?: string;
  analysis: {
    bestCondition: SkinCondition | null;
    worstCondition: SkinCondition | null;
    dominantCondition: SkinCondition | null;
  };
  userInputs?: Partial<UserSkinProfile>;
  metaWeighting?: { aiWeight: number; userWeight: number };
  combinedInsights?: Record<string, {
    aiScore: number | null;
    userScore?: number;
    combinedScore: number;
    weight: { ai: number; user: number };
  }>;
  recommendations?: any[];
  compatibilityWarning?: string;
}

export class UserSkinProfile {
  @IsEnum(['Oily', 'Dry', 'Combination', 'Sensitive', 'Normal'])
  skinType!: 'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal';

  @IsEnum(['Type I', 'Type II', 'Type III', 'Type IV', 'Type V', 'Type VI'])
  @IsOptional()
  fitzpatrickType?: 'Type I' | 'Type II' | 'Type III' | 'Type IV' | 'Type V' | 'Type VI';

  @IsInt()
  @Min(1)
  @Max(120)
  age!: number;

  @IsEnum(['Male', 'Female', 'Other'])
  @IsOptional()
  gender?: 'Male' | 'Female' | 'Other';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  concerns?: string[];

  @IsString()
  @IsOptional()
  imageBase64?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imagesBase64?: string[];

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  acneLevel?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  blackheadsLevel?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  poreSize?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  wrinklesDepth?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  sensitivityLevel?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  hydrationLevel?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  rednessLevel?: number;
}
