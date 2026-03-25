import {
    IsOptional,
    IsString,
    IsBoolean,
    IsNumber,
    IsIn,
    Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ProductFilterDto {
    /** Full-text search on name and description */
    @IsOptional()
    @IsString()
    search?: string;

    /** Product type: cleanser | serum | moisturizer | treatment */
    @IsOptional()
    @IsString()
    type?: string;

    /** Filter by a specific ingredient (partial match) */
    @IsOptional()
    @IsString()
    ingredient?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    /** Only return "clean ingredient" products */
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return undefined;
    })
    @IsBoolean()
    isClean?: boolean;

    /** Field to sort by */
    @IsOptional()
    @IsIn(['price', 'rating', 'name'])
    sortBy?: 'price' | 'rating' | 'name';

    /** Sort direction */
    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC';
}
