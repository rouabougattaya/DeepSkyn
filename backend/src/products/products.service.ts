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
            limit = 50,
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
            // ingredients is the entity property
            qb.andWhere('LOWER(product.ingredients) LIKE :ingredient', {
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
            qb.andWhere('product.isClean = :isClean', { isClean });
        }

        const columnMap: Record<string, string> = {
            price: 'product.price',
            rating: 'product.rating',
            name: 'product.name',
        };

        qb.orderBy(columnMap[sortBy] ?? 'product.name', sortOrder);
        
        qb.limit(limit);

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
            .select('product.ingredients', 'ingredients')
            .where('product.ingredients IS NOT NULL')
            .getRawMany<{ ingredients: string }>();

        const set = new Set<string>();
        for (const row of rows) {
            if (!row.ingredients) continue;
            const cleanString = row.ingredients
                .replace(/[\[\]']/g, '') // Remove brackets and single quotes
                .split(',')
                .map((i) => i.trim())
                .filter(Boolean);
                
            cleanString.forEach((i) => set.add(i));
        }

        return Array.from(set).sort();
    }
}
