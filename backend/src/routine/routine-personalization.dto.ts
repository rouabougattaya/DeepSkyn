import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Body du POST /routine/update
 * Le client peut optionnellement forcer la régénération.
 */
export class UpdateRoutineDto {
    /** Force la régénération même si aucune nouvelle analyse n'est disponible */
    @IsOptional()
    @IsBoolean()
    forceRegenerate?: boolean;
}

/* ───── Response DTOs ───── */

export interface TrendDetail {
    current: number;
    previous: number;
    delta: number;
    trend: 'improving' | 'worsening' | 'stable';
}

export interface TrendSnapshot {
    hydration: TrendDetail;
    oil: TrendDetail;
    acne: TrendDetail;
    wrinkles: TrendDetail;
    globalScoreTrend: 'improving' | 'worsening' | 'stable';
}

export interface AdjustmentRule {
    rule: string;
    action: string;
    reason: string;
}

export interface PersonalizedProductDto {
    id: string;
    name: string;
    type: string;
    price: number;
    url: string | null;
}

export interface PersonalizedStepDto {
    stepOrder: number;
    stepName: string;
    notes?: string;
    adjustmentReason?: string;
    product: PersonalizedProductDto;
}

export interface RoutineUpdateResponseDto {
    compatibilityWarning?: string;
    message: string;
    personalizationId: string;
    inferredSkinType: string;
    analysisCount: number;
    trends: TrendSnapshot;
    adjustments: AdjustmentRule[];
    routine: {
        morning: { steps: PersonalizedStepDto[] };
        night: { steps: PersonalizedStepDto[] };
    };
}
