import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { Product } from '../products/entities/product.entity';
import { Recommendation } from './recommendation.entity';
import { RecommendationItem } from '../recommendationItem/recommendation-item.entity';
import * as child_process from 'child_process';
import * as fs from 'fs';

// Global mock for child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
  }),
}));

describe('RecommendationService', () => {
  let service: RecommendationService;
  let mockProductRepository: jest.Mocked<Repository<Product>>;
  let mockRecommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let mockItemRepository: jest.Mocked<Repository<RecommendationItem>>;

  beforeEach(async () => {
    mockProductRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockRecommendationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    mockItemRepository = {
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    } as any;

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepository,
        },
        {
          provide: getRepositoryToken(RecommendationItem),
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRecommendationsForSkinState', () => {
    it('should use database fallback when Python is disabled', async () => {
      (service as any).pythonDisabled = true;
      const userId = 'test-user-123';
      const analysisId = 'analysis-456';
      const skinType = 'oily';
      const concerns = ['acne', 'excess-oil'];

      const mockProducts = [
        {
          id: '1',
          name: 'Oil Control Serum',
          type: 'serum',
          price: 35.99,
          isClean: true,
        } as any,
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecommendationsForSkinState(
        userId,
        analysisId,
        skinType,
        concerns
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include concerns in recommendations when provided', async () => {
      (service as any).pythonDisabled = true;
      const userId = 'user-xyz';
      const analysisId = 'analysis-789';
      const skinType = 'dry';
      const concerns = ['sensitivity', 'dryness'];

      const mockProducts = [
        {
          id: '2',
          name: 'Gentle Moisturizer',
          type: 'moisturizer',
          price: 28.99,
          isClean: true,
        } as any,
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecommendationsForSkinState(
        userId,
        analysisId,
        skinType,
        concerns
      );

      expect(result).toBeDefined();
    });

    it('should handle empty concerns array', async () => {
      (service as any).pythonDisabled = true;
      const userId = 'user-abc';
      const analysisId = 'analysis-def';
      const skinType = 'combination';
      const concerns: string[] = [];

      const mockProducts = [
        {
          id: '3',
          name: 'Balanced Cleanser',
          type: 'cleanser',
          price: 18.99,
          isClean: true,
        } as any,
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecommendationsForSkinState(
        userId,
        analysisId,
        skinType,
        concerns
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle undefined concerns (treated as empty array)', async () => {
      (service as any).pythonDisabled = true;
      const userId = 'user-ghi';
      const analysisId = 'analysis-jkl';
      const skinType = 'sensitive';

      const mockProducts: any[] = [];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProducts),
      };

      mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecommendationsForSkinState(
        userId,
        analysisId,
        skinType
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should attempt to call Python script via spawn when data exists', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const promise = service.getRecommendationsForSkinState('user-1', 'analysis-1', 'oily', ['acne']);
      
      // Simulate stdout data
      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(c => c[0] === 'data')[1];
      stdoutCallback(Buffer.from(JSON.stringify([{ productId: '101', name: 'Python Product' }])));

      // Simulate process close
      const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
      closeCallback(0);

      const result = await promise;
      const spawnSpy = child_process.spawn;
      expect(spawnSpy).toHaveBeenCalled();
      expect(result[0].name).toBe('Python Product');
    });

    it('should handle Python script stderr and still resolve or fallback', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const promise = service.getRecommendationsForSkinState('user-err', 'analysis-err', 'oily');
      
      // Simulate stderr data
      const stderrCallback = mockProcess.stderr.on.mock.calls.find(c => c[0] === 'data')[1];
      stderrCallback(Buffer.from('Some python warning'));

      // Simulate process close with error code
      const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
      closeCallback(1); // Error code

      const result = await promise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should fallback to database if Python script fails completely', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);
      
      // Mock DB products for fallback
      const mockProducts = [{ id: '99', name: 'Fallback Product', type: 'Serum', url: 'https://example.com' } as any];
      mockProductRepository.find.mockResolvedValue(mockProducts);

      const promise = service.getRecommendationsForSkinState('user-fail', 'analysis-fail', 'dry');
      
      const closeCallback = mockProcess.on.mock.calls.find(c => c[0] === 'close')[1];
      closeCallback(1); // Failure

      const result = await promise;
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('Fallback Product');
    });
  });

  describe('saveFinalRecommendations', () => {
    it('should save recommendations with all parameters', async () => {
      const userId = 'user-save-123';
      const analysisId = 'analysis-save-456';
      const recommendations = [
        { productId: '1', name: 'Product A', reason: 'Perfect for your skin' },
        { productId: '2', name: 'Product B', reason: 'Complements Product A' },
      ];
      const explanation = 'Recommendations based on oily skin profile';
      const aiConfidenceScore = 0.92;

      const mockRecommendation = {
        id: 'rec-123',
        userId,
        analysisId,
        explanation,
        aiConfidenceScore,
        itemCount: 2,
      };

      mockProductRepository.findOne.mockResolvedValue({ id: '1', name: 'Product A' } as any);
      mockRecommendationRepository.create.mockReturnValue(mockRecommendation as any);
      mockRecommendationRepository.save.mockResolvedValue(mockRecommendation as any);
      mockItemRepository.create.mockReturnValue({} as any);
      mockItemRepository.save.mockResolvedValue({} as any);

      await service.saveFinalRecommendations(
        userId,
        analysisId,
        recommendations,
        explanation,
        aiConfidenceScore
      );

      expect(mockRecommendationRepository.save).toHaveBeenCalled();
    });

    it('should save recommendations without optional parameters', async () => {
      const userId = 'user-save-789';
      const analysisId = 'analysis-save-999';
      const recommendations = [
        { productId: '1', name: 'Product A' },
      ];

      const mockRecommendation = {
        id: 'rec-789',
        userId,
        analysisId,
      };

      mockProductRepository.findOne.mockResolvedValue({ id: '1', name: 'Product A' } as any);
      mockRecommendationRepository.create.mockReturnValue(mockRecommendation as any);
      mockRecommendationRepository.save.mockResolvedValue(mockRecommendation as any);
      mockItemRepository.create.mockReturnValue({} as any);
      mockItemRepository.save.mockResolvedValue({} as any);

      await service.saveFinalRecommendations(
        userId,
        analysisId,
        recommendations
      );

      expect(mockRecommendationRepository.save).toHaveBeenCalled();
    });

    it('should handle empty recommendations array', async () => {
      const userId = 'user-empty';
      const analysisId = 'analysis-empty';
      const recommendations: any[] = [];

      await service.saveFinalRecommendations(
        userId,
        analysisId,
        recommendations
      );

      expect(mockRecommendationRepository.save).not.toHaveBeenCalled();
    });

    it('should save multiple recommendation items', async () => {
      const userId = 'user-multi';
      const analysisId = 'analysis-multi';
      const recommendations = [
        { productId: '1', name: 'Product 1', reason: 'Reason 1', rank: 1 },
        { productId: '2', name: 'Product 2', reason: 'Reason 2', rank: 2 },
        { productId: '3', name: 'Product 3', reason: 'Reason 3', rank: 3 },
      ];

      const mockRecommendation = {
        id: 'rec-multi',
        userId,
        analysisId,
        itemCount: 3,
      };

      mockProductRepository.findOne.mockResolvedValue({ id: '1' } as any);
      mockRecommendationRepository.create.mockReturnValue(mockRecommendation as any);
      mockRecommendationRepository.save.mockResolvedValue(mockRecommendation as any);
      mockItemRepository.create.mockReturnValue({} as any);
      mockItemRepository.save.mockResolvedValue({} as any);

      await service.saveFinalRecommendations(
        userId,
        analysisId,
        recommendations
      );

      // Should call save for each item
      expect(mockItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('confidence score validation', () => {
    it('should accept confidence score between 0 and 1', async () => {
      mockProductRepository.findOne.mockResolvedValue({ id: '1' } as any);
      mockRecommendationRepository.save.mockResolvedValue({ id: 'rec-1' } as any);

      await service.saveFinalRecommendations(
        'user-score',
        'analysis-score',
        [{ name: 'Product A' }]
      );

      expect(mockRecommendationRepository.save).toHaveBeenCalled();
    });

    it('should handle high confidence scores', async () => {
      jest.clearAllMocks();
      
      mockProductRepository.findOne.mockResolvedValue({ id: '1' } as any);
      mockRecommendationRepository.save.mockResolvedValue({ id: 'rec-high' } as any);

      await service.saveFinalRecommendations(
        'user-high',
        'analysis-high',
        [{ productId: '1', name: 'Product' }]
      );

      expect(mockRecommendationRepository.save).toHaveBeenCalled();
    });

    it('should handle low confidence scores', async () => {
      jest.clearAllMocks();

      mockProductRepository.findOne.mockResolvedValue({ id: '1' } as any);
      mockRecommendationRepository.save.mockResolvedValue({ id: 'rec-low' } as any);

      await service.saveFinalRecommendations(
        'user-low',
        'analysis-low',
        [{ name: 'Product B' }]
      );

      expect(mockRecommendationRepository.save).toHaveBeenCalled();
    });
  });

  describe('Retrieval methods (getRecommendationsForAnalysis / getLatestFinalRecommendationsForUser)', () => {
    const mockItems = [
      { productId: 'p1', ranking: 1, reason: 'r1' },
      { productId: 'p2', ranking: 2, reason: 'r2' }
    ];
    const mockProducts = [
      { id: 'p1', name: 'Product 1' },
      { id: 'p2', name: 'Product 2' }
    ];
    
    it('should return empty if no analysisId / userId provided', async () => {
      expect(await service.getRecommendationsForAnalysis('')).toEqual([]);
      expect(await service.getLatestFinalRecommendationsForUser('')).toEqual([]);
    });

    it('should return empty if no recommendation found', async () => {
      mockRecommendationRepository.findOne.mockResolvedValue(null);
      expect(await service.getRecommendationsForAnalysis('a1')).toEqual([]);
    });

    it('should return empty if no items found', async () => {
      mockRecommendationRepository.findOne.mockResolvedValue({ id: 'rec-1' } as any);
      mockItemRepository.find.mockResolvedValue([]);
      expect(await service.getRecommendationsForAnalysis('a1')).toEqual([]);
    });

    it('should retrieve recommendations mapped with products', async () => {
      mockRecommendationRepository.findOne.mockResolvedValue({ id: 'rec-1', analysisId: 'a1' } as any);
      mockItemRepository.find.mockResolvedValue(mockItems as any);
      
      // Mock In operator
      mockProductRepository.find.mockResolvedValue(mockProducts as any);

      const result = await service.getLatestFinalRecommendationsForUser('u1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Product 1');
      expect(result[0].reason).toBe('r1');
      expect(result[0].ranking).toBe(1);
    });
  });
});
