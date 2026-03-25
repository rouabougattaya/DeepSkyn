import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Recommendation } from './recommendation.entity';
import { RecommendationItem } from '../recommendationItem/recommendation-item.entity';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Recommendation, RecommendationItem]),
  ],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule implements OnModuleInit {
  constructor(private readonly recommendationService: RecommendationService) { }

  async onModuleInit() {
    // Initializer la base de produits pour la recommandation
    await this.recommendationService.seedProducts();
  }
}
