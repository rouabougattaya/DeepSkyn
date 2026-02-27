import { Injectable } from '@nestjs/common';

export type MetricType = 'hydration' | 'oil' | 'acne' | 'wrinkles';

export interface MetricEntry {
    type: MetricType;
    value: number;
}

/**
 * ScoringService - Simple legacy scoring calculator.
 * Kept for basic dashboard compatibility.
 */
@Injectable()
export class ScoringService {
    calculateGlobalScore(metrics: MetricEntry[], weights: any): number {
        if (!metrics.length) return 0;

        let totalWeight = 0;
        let weightedSum = 0;

        metrics.forEach(m => {
            const weight = weights[m.type] ?? 1;
            let val = m.value;

            // Inverse score for negative conditions (acne/wrinkles)
            if (m.type === 'acne' || m.type === 'wrinkles') {
                val = Math.max(0, 100 - val);
            }

            weightedSum += val * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
}
