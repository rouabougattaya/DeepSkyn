import { apiGet } from './apiClient';

export interface Product {
    id: string;
    name: string;
    description?: string;
    price?: number;
    type: string;
    ingredients?: string[];
    targetIssues?: string[];
    rating?: number;
    imageUrl?: string;
    isClean: boolean;
    url?: string;
    skinType?: string;
}

export interface ProductFilterParams {
    search?: string;
    type?: string;
    ingredient?: string;
    minPrice?: number;
    maxPrice?: number;
    isClean?: boolean;
    sortBy?: 'price' | 'rating' | 'name';
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
}

function buildQuery(params: ProductFilterParams): string {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.type) qs.set('type', params.type);
    if (params.ingredient) qs.set('ingredient', params.ingredient);
    if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
    if (params.isClean !== undefined) qs.set('isClean', String(params.isClean));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    return qs.toString() ? `?${qs.toString()}` : '';
}

export const productService = {
    filter(params: ProductFilterParams = {}): Promise<Product[]> {
        return apiGet<Product[]>(`/products/filter${buildQuery(params)}`);
    },

    getTypes(): Promise<string[]> {
        return apiGet<string[]>('/products/types');
    },

    getIngredients(): Promise<string[]> {
        return apiGet<string[]>('/products/ingredients');
    },
};
