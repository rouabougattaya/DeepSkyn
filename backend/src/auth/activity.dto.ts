import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType, RiskLevel } from './activity.entity';

export class ActivityQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;

    @IsOptional()
    @IsEnum(ActivityType)
    type?: ActivityType;

    @IsOptional()
    @IsEnum(RiskLevel)
    riskLevel?: RiskLevel;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @IsString()
    userId?: string; // Admin only
}

export class CreateActivityDto {
    userId: string;
    type: ActivityType;
    metadata?: Record<string, any>;
    ipAddress?: string;
    deviceInfo?: string;
    location?: { country?: string; city?: string; region?: string };
}

export class ActivityExportDto {
    @IsOptional()
    @IsEnum(['csv', 'pdf'])
    format?: 'csv' | 'pdf' = 'csv';

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;
}
