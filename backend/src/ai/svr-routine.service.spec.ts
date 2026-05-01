import { Test, TestingModule } from '@nestjs/testing';
import { SvrRoutineService } from './svr-routine.service';
import { OpenRouterService } from './openrouter.service';
import * as fs from 'fs';

jest.mock('fs');

describe('SvrRoutineService', () => {
  let service: SvrRoutineService;
  let mockOpenRouterService: jest.Mocked<Partial<OpenRouterService>>;

  const mockProfile = {
    skinType: 'Oily' as const,
    age: 25,
    gender: 'Female' as const,
    concerns: ['Acne'],
    acneLevel: 80,
    blackheadsLevel: 20,
    poreSize: 60,
    wrinklesDepth: 10,
    hydrationLevel: 80,
    rednessLevel: 10,
    sensitivityLevel: 10,
  };

  beforeEach(async () => {
    mockOpenRouterService = {
      generateSVRRoutine: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SvrRoutineService,
        { provide: OpenRouterService, useValue: mockOpenRouterService },
      ],
    }).compile();

    service = module.get<SvrRoutineService>(SvrRoutineService);
    
    // Clear the cache manually since it's private
    service['scrapedCatalogCache'] = null;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRoutine', () => {
    it('should successfully generate a routine using OpenRouter LLM', async () => {
      const mockResult = {
        recommendedProducts: [{ name: 'SVR Sebiaclear' }],
        morning: [],
        night: [],
        skinProfile: 'Oily skin',
        generalAdvice: 'Use sunscreen',
      };

      mockOpenRouterService.generateSVRRoutine!.mockResolvedValueOnce(mockResult);

      const result = await service.generateRoutine(mockProfile);

      expect(result).toEqual(mockResult);
      expect(mockOpenRouterService.generateSVRRoutine).toHaveBeenCalledTimes(1);
      
      // Ensure the correct derived concerns are passed
      const callArgs = mockOpenRouterService.generateSVRRoutine!.mock.calls[0];
      expect(callArgs[1].concerns).toContain('acne'); // Explicit
      expect(callArgs[1].concerns).toContain('pores'); // Derived from poreSize > 50
    });

    it('should fallback to hardcoded routine if LLM fails', async () => {
      mockOpenRouterService.generateSVRRoutine!.mockRejectedValueOnce(new Error('LLM Failed'));

      const result = await service.generateRoutine(mockProfile);

      // Verify fallback properties
      expect(result).toHaveProperty('recommendedProducts');
      expect(result).toHaveProperty('morning');
      expect(result).toHaveProperty('night');
      expect(result.skinProfile).toContain('Peau Oily');
      
      // Should recommend at least a cleanser, serum, moisturizer, sunscreen
      const categories = result.recommendedProducts.map(p => p.category);
      expect(categories).toContain('cleanser');
      expect(categories).toContain('serum');
      expect(categories).toContain('moisturizer');
      expect(categories).toContain('sunscreen');
    });

    it('should handle missing scraped catalog gracefully', async () => {
      // Mock fs.existsSync to return false
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      mockOpenRouterService.generateSVRRoutine!.mockResolvedValueOnce({
        recommendedProducts: [], morning: [], night: [], skinProfile: '', generalAdvice: ''
      });

      await service.generateRoutine(mockProfile);
      
      // Should have successfully called LLM even without scraped catalog
      expect(mockOpenRouterService.generateSVRRoutine).toHaveBeenCalled();
    });

    it('should parse scraped catalog successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([
        {
          name: 'Fake SVR Product',
          url: 'http://test.com',
          description: 'A test product for oily skin',
          target_concerns: ['ACNE']
        }
      ]));

      mockOpenRouterService.generateSVRRoutine!.mockResolvedValueOnce({
        recommendedProducts: [], morning: [], night: [], skinProfile: '', generalAdvice: ''
      });

      await service.generateRoutine(mockProfile);
      
      // Check that the scraped product was mapped correctly
      // Final pool passed to LLM is in the first argument
      const pool = mockOpenRouterService.generateSVRRoutine!.mock.calls[0][0];
      const found = pool.find((p: any) => p.name === 'Fake SVR Product');
      expect(found).toBeDefined();
      expect(found.category).toBe('treatment'); // inferCategoryFromText fallback is treatment
    });
  });

  describe('getDebugProducts', () => {
    it('should return a list of products', () => {
      const products = service.getDebugProducts();
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('name');
    });
  });
});
