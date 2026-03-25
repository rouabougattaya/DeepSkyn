import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Product])],
    controllers: [ProductsController],
    providers: [ProductsService],
    /**
     * Export the repository so other modules (e.g. RecommendationModule,
     * RoutineModule) that import ProductsModule can inject the Product entity.
     */
    exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule { }
