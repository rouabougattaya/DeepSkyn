import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductFilterDto } from './dto/product-filter.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockRepository: jest.Mocked<Repository<Product>>;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  // Helper to create mock product
  const createMockProduct = (overrides: any = {}) => ({
    id: '1',
    name: 'Test Product',
    description: 'Test',
    type: 'serum',
    ingredients: ['Water', 'Glycerin'],
    targetIssues: ['acne'],
    price: 15.99,
    rating: 4.5,
    imageUrl: 'http://example.com/image.jpg',
    isClean: true,
    url: 'http://example.com',
    skinType: 'oily',
    cluster: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('filterProducts', () => {
    it('should return products without filters (list all)', async () => {
      const mockProducts: Product[] = [
        createMockProduct({ id: '1', name: 'Cleanser' }) as any,
        createMockProduct({ id: '2', name: 'Moisturizer' }) as any,
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.filterProducts({} as ProductFilterDto);
      expect(result).toEqual(mockProducts);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      const mockProducts: Product[] = [
        createMockProduct({ id: '1', name: 'Hydrating Serum' }) as any,
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.filterProducts({
        search: 'serum',
      } as ProductFilterDto);

      expect(result).toEqual(mockProducts);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search)',
        { search: '%serum%' }
      );
    });

    it('should filter by product type', async () => {
      const mockProducts: Product[] = [
        createMockProduct({ id: '1', name: 'Facial Sunscreen', type: 'sunscreen' }) as any,
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.filterProducts({
        type: 'sunscreen',
      } as ProductFilterDto);

      expect(result).toEqual(mockProducts);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(product.type) = :type',
        { type: 'sunscreen' }
      );
    });

    it('should filter by ingredient', async () => {
      const mockProducts: Product[] = [];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.filterProducts({
        ingredient: 'Retinol',
      } as ProductFilterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(product.ingredients) LIKE :ingredient',
        { ingredient: '%retinol%' }
      );
    });

    it('should filter by price range', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.filterProducts({
        minPrice: 20,
        maxPrice: 50,
      } as ProductFilterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 20 }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 50 }
      );
    });

    it('should filter by isClean flag', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.filterProducts({
        isClean: true,
      } as ProductFilterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.isClean = :isClean',
        { isClean: true }
      );
    });

    it('should apply sorting and pagination', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.filterProducts({
        sortBy: 'price',
        sortOrder: 'DESC',
        limit: 20,
      } as ProductFilterDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.price', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('should handle invalid sortBy gracefully', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.filterProducts({
        sortBy: 'name',
        limit: 50,
      } as ProductFilterDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.name', 'ASC');
    });

    it('should apply default limit of 50', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.filterProducts({} as ProductFilterDto);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('getUniqueTypes', () => {
    it('should return all unique product types', async () => {
      const mockTypes = [
        { type: 'cleanser' },
        { type: 'moisturizer' },
        { type: 'serum' },
        { type: 'sunscreen' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockTypes),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUniqueTypes();

      expect(result).toEqual(['cleanser', 'moisturizer', 'serum', 'sunscreen']);
    });

    it('should filter out null types', async () => {
      const mockTypes = [
        { type: 'cleanser' },
        { type: null },
        { type: 'moisturizer' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockTypes),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUniqueTypes();

      expect(result).toEqual(['cleanser', 'moisturizer']);
    });
  });

  describe('getUniqueIngredients', () => {
    it('should return all unique ingredients with deduplication', async () => {
      const mockRows = [
        { ingredients: 'Water, Glycerin, Lanolin' },
        { ingredients: 'Water, Aloe, Glycerin' },
        { ingredients: 'Lanolin, Jojoba Oil' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRows),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUniqueIngredients();

      expect(result).toContain('Water');
      expect(result).toContain('Glycerin');
      expect(result).toContain('Lanolin');
      expect(result).toContain('Aloe');
      expect(result).toContain('Jojoba Oil');
    });

    it('should handle null ingredients gracefully', async () => {
      const mockRows = [
        { ingredients: 'Water, Glycerin' },
        { ingredients: null },
        { ingredients: 'Aloe' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRows),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUniqueIngredients();

      expect(result).toContain('Water');
      expect(result).toContain('Aloe');
    });

    it('should return empty array when no ingredients found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUniqueIngredients();

      expect(result).toEqual([]);
    });
  });
});
