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
    createdAt?: string;
}

export interface UpdateRoutineDto {
    forceRegenerate?: boolean;
}
