import { Test, TestingModule } from '@nestjs/testing';
import { IncompatibilityService } from './incompatibility.service';
import { Product } from '../products/entities/product.entity';

describe('IncompatibilityService', () => {
  let service: IncompatibilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncompatibilityService],
    }).compile();

    service = module.get<IncompatibilityService>(IncompatibilityService);
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('checkRoutine', () => {
    it('devrait retourner "Aucun conflit" pour des produits compatibles', () => {
      const products = [
        { name: 'Crème hydratante', ingredients: ['eau', 'glycérine'] },
        { name: 'Sérum apaisant', ingredients: ['niacinamide'] },
      ] as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(false);
      expect(result.message).toContain('Aucun conflit');
    });

    it('devrait gérer les produits nuls ou indéfinis sans crasher', () => {
      const products = [
        null,
        { name: 'Crème hydratante', ingredients: ['eau'] },
        undefined,
      ] as unknown as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(false);
      expect(result.message).toContain('Aucun conflit');
    });

    it('devrait détecter un conflit entre Rétinol et AHA (par le nom)', () => {
      const products = [
        { name: 'Sérum Rétinol 1%', ingredients: [] },
        { name: 'Lotion Acide Glycolique', ingredients: [] },
      ] as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(true);
      expect(result.message).toContain('Sérum Rétinol 1%');
      expect(result.message).toContain('Lotion Acide Glycolique');
      expect(result.message).toContain('Rétinol + AHA');
    });

    it('devrait détecter un conflit entre Vitamine C et AHA (par les ingrédients)', () => {
      const products = [
        { name: 'Produit A', ingredients: ['aqua', 'ascorbic acid'] }, // Vit C
        { name: 'Produit B', ingredients: ['lactic acid'] }, // AHA
      ] as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(true);
      expect(result.message).toContain('Vitamine C + AHA');
    });

    it('devrait détecter un conflit BHA et Rétinol (par la description)', () => {
      const products = [
        { name: 'Produit A', description: 'Contient du BHA pour exfolier' },
        { name: 'Produit B', description: 'Crème au retinol' },
      ] as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(true);
      expect(result.message).toContain('Rétinol + BHA');
    });

    it('devrait détecter un conflit Benzoyl Peroxide et Rétinol', () => {
      const products = [
        { name: 'Crème anti-acné', ingredients: ['benzoyl peroxide'] },
        { name: 'Sérum nuit', ingredients: ['retinoid'] },
      ] as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(true);
      expect(result.message).toContain('Benzoyl Peroxide + Rétinol');
    });

    it('devrait cumuler plusieurs conflits (cas limite)', () => {
      const products = [
        { name: 'Sérum Vit C', ingredients: ['vitamin c'] },
        { name: 'Lotion AHA', ingredients: ['aha'] },
        { name: 'Crème Rétinol', ingredients: ['retinol'] },
      ] as Product[];

      const result = service.checkRoutine(products);

      expect(result.hasConflict).toBe(true);
      expect(result.message).toContain('Vitamine C + AHA');
      expect(result.message).toContain('Rétinol + AHA');
      expect(result.message).toContain('Rétinol + Vitamine C');
      
      // Doit inclure le nom de tous les produits impliqués
      expect(result.message).toContain('Sérum Vit C');
      expect(result.message).toContain('Lotion AHA');
      expect(result.message).toContain('Crème Rétinol');
    });
  });
});
