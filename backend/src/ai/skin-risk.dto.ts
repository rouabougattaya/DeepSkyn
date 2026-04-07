import { IsOptional, IsNumber, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EnvironmentDto {
  @IsOptional()
  @IsNumber()
  humidity?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  uvIndex?: number;

  @IsOptional()
  @IsString()
  pollution?: string;
}

export class HabitsDto {
  @IsOptional()
  @IsNumber()
  sleepHours?: number;

  @IsOptional()
  @IsNumber()
  waterIntake?: number;

  @IsOptional()
  @IsString()
  sunProtection?: string;

  @IsOptional()
  @IsString()
  Exercise?: string;

  @IsOptional()
  @IsString()
  stressLevel?: string;

  @IsOptional()
  @IsString()
  diet?: string;

  @IsOptional()
  @IsString()
  skincarRoutine?: string;
}

export class SkinRiskInput {
  // Current skin metrics
  @IsOptional()
  @IsNumber()
  acneScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  drynessScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  wrinklesScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  poresScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  sensitivityScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  pigmentationScore?: number; // 0-100

  // Environmental factors
  @IsOptional()
  @ValidateNested()
  @Type(() => EnvironmentDto)
  environment?: EnvironmentDto;

  // User habits
  @IsOptional()
  @ValidateNested()
  @Type(() => HabitsDto)
  habits?: HabitsDto;

  // Personal info
  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  skinType?: string; // 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal'

  @IsOptional()
  @IsNumber()
  fitzpatrickSkin?: number; // 1-6
}

export class SkinRiskAlert {
  type!: 'acne' | 'dryness' | 'aging' | 'sensitivity' | 'pigmentation' | 'redness';
  risk_score!: number; // 0-100
  cause!: string;
  prevention!: string[];
  urgency?: 'low' | 'medium' | 'high';
  timeline?: 'weeks' | 'months' | 'long-term';
}

export class SkinRiskResponse {
  risks!: SkinRiskAlert[];
  overall_risk_score!: number; // 0-100
  summary!: string;
  immediate_actions!: string[];
  timestamp!: Date;
}
