import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Public } from '../auth/decorators/public.decorator';
// JwtAccessGuard is applied globally via APP_GUARD in AuthModule — no need to repeat it here.

@Public()
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    /**
     * GET /products/filter
     * Filter and search products.
     * Query params: search, type, ingredient, minPrice, maxPrice, isClean, sortBy, sortOrder
     */
    @Get('filter')
    filterProducts(@Query() dto: ProductFilterDto) {
        return this.productsService.filterProducts(dto);
    }

    /**
     * GET /products/types
     * Returns the list of unique product types (for filter UI).
     */
    @Get('types')
    getTypes() {
        return this.productsService.getUniqueTypes();
    }

    /**
     * GET /products/ingredients
     * Returns the list of unique ingredients (for filter UI).
     */
    @Get('ingredients')
    getIngredients() {
        return this.productsService.getUniqueIngredients();
    }
}
