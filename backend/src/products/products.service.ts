import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductFilterDto } from './dto/product-filter.dto';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    /** Filter / search products with dynamic query builder */
    async filterProducts(dto: ProductFilterDto): Promise<Product[]> {
        const {
            search,
            type,
            ingredient,
            minPrice,
            maxPrice,
            isClean,
            sortBy = 'name',
            sortOrder = 'ASC',
        } = dto;

        const qb = this.productRepository.createQueryBuilder('product');

        if (search) {
            qb.andWhere(
                '(LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search)',
                { search: `%${search.toLowerCase()}%` },
            );
        }

        if (type) {
            qb.andWhere('LOWER(product.type) = :type', { type: type.toLowerCase() });
        }

        if (ingredient) {
            // ingredients is stored as a comma-separated simple-array string
            qb.andWhere('LOWER(product.clean_ingreds) LIKE :ingredient', {
                ingredient: `%${ingredient.toLowerCase()}%`,
            });
        }

        if (minPrice !== undefined) {
            qb.andWhere('product.price >= :minPrice', { minPrice });
        }

        if (maxPrice !== undefined) {
            qb.andWhere('product.price <= :maxPrice', { maxPrice });
        }

        if (isClean !== undefined) {
            qb.andWhere('product.is_clean = :isClean', { isClean });
        }

        const columnMap: Record<string, string> = {
            price: 'product.price',
            rating: 'product.rating',
            name: 'product.name',
        };

        qb.orderBy(columnMap[sortBy] ?? 'product.name', sortOrder);

        return qb.getMany();
    }

    /** Return all unique product types */
    async getUniqueTypes(): Promise<string[]> {
        const rows = await this.productRepository
            .createQueryBuilder('product')
            .select('DISTINCT product.type', 'type')
            .where('product.type IS NOT NULL')
            .orderBy('product.type', 'ASC')
            .getRawMany<{ type: string }>();

        return rows.map((r) => r.type).filter(Boolean);
    }

    /**
     * Return unique ingredients.
     * Because many rows store all ingredients in one CSV cell,
     * we split, flatten, deduplicate in JS.
     */
    async getUniqueIngredients(): Promise<string[]> {
        const rows = await this.productRepository
            .createQueryBuilder('product')
            .select('product.clean_ingreds', 'ingredients')
            .where('product.clean_ingreds IS NOT NULL')
            .getRawMany<{ ingredients: string }>();

        const set = new Set<string>();
        for (const row of rows) {
            if (!row.ingredients) continue;
            row.ingredients
                .split(',')
                .map((i) => i.trim())
                .filter(Boolean)
                .forEach((i) => set.add(i));
        }

        return Array.from(set).sort();
    }
}
