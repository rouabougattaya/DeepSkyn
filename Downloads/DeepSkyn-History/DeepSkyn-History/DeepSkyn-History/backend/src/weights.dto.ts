import { IsNumber, Min, IsOptional } from 'class-validator';

/**
 * WeightsDto - Compatibility layer for legacy skin analysis.
 * Used by SkinMetricService for older calculations.
 */
export class WeightsDto {
    @IsNumber()
    @Min(0)
    @IsOptional()
    hydration: number = 1;

    @IsNumber()
    @Min(0)
    @IsOptional()
    oil: number = 1;

    @IsNumber()
    @Min(0)
    @IsOptional()
    acne: number = 1;

    @IsNumber()
    @Min(0)
    @IsOptional()
    wrinkles: number = 1;
}
