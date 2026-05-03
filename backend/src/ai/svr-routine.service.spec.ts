import { Test, TestingModule } from '@nestjs/testing';
import { SvrRoutineService } from './svr-routine.service';
import { OpenRouterService } from './openrouter.service';
import * as fs from 'fs';

jest.mock('fs');

describe('SvrRoutineService', () => {
  let service: SvrRoutineService;
  let openRouterService: OpenRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SvrRoutineService,
        {
          provide: OpenRouterService,
          useValue: {
            generateSVRRoutine: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SvrRoutineService>(SvrRoutineService);
    openRouterService = module.get<OpenRouterService>(OpenRouterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRoutine', () => {
    const mockProfile = {
      skinType: 'Oily',
      age: 25,
      acneLevel: 60,
      blackheadsLevel: 60,
      poreSize: 60,
      wrinklesDepth: 10,
      hydrationLevel: 80,
      rednessLevel: 10,
      sensitivityLevel: 10,
      concerns: ['acne'],
    };

    it('should generate a routine using AI when OpenRouter succeeds', async () => {
      const mockAiResponse = {
        recommendedProducts: [
          { name: 'SVR Sebiaclear Gel Moussant', category: 'cleanser', description: 'desc', price: 10, url: 'url', keyIngredients: [], reason: 'r', skinBenefit: 'sb', score: 9 }
        ],
        morning: [],
        night: [],
        skinProfile: 'Oily Skin Profile',
        generalAdvice: 'Drink water',
      };

      (openRouterService.generateSVRRoutine as jest.Mock).mockResolvedValueOnce(mockAiResponse);

      const result = await service.generateRoutine(mockProfile);

      expect(openRouterService.generateSVRRoutine).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.skinProfile).toBe('Oily Skin Profile');
      expect(result.recommendedProducts).toHaveLength(1);
    });

    it('should generate a fallback routine when AI fails', async () => {
      (openRouterService.generateSVRRoutine as jest.Mock).mockRejectedValueOnce(new Error('AI Failed'));

      const result = await service.generateRoutine(mockProfile);

      expect(result).toBeDefined();
      expect(result.skinProfile).toBe('Peau Oily');
      expect(result.morning.length).toBeGreaterThan(0);
      expect(result.night.length).toBeGreaterThan(0);
    });
  });

  describe('Private methods and scraping', () => {
    it('should map scraped JSON correctly', async () => {
      const mockScrapedData = [
        {
          name: 'SVR Test Crème',
          url: 'http://test.com',
          description: 'Soin hydratant anti-rides pour peau sèche.',
          target_concerns: ['RIDES', 'PEAU SECHE'],
          image: 'img.jpg'
        }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockScrapedData));

      (openRouterService.generateSVRRoutine as jest.Mock).mockResolvedValueOnce({ skinProfile: 'ok' });

      // Trigger cache population
      const result = await service.generateRoutine({ skinType: 'Dry', age: 50 });
      
      expect(result).toBeDefined();
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should handle missing JSON file gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (openRouterService.generateSVRRoutine as jest.Mock).mockResolvedValueOnce({ skinProfile: 'ok' });

      const result = await service.generateRoutine({ skinType: 'Normal', age: 30 });
      expect(result).toBeDefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      (openRouterService.generateSVRRoutine as jest.Mock).mockResolvedValueOnce({ skinProfile: 'ok' });

      const result = await service.generateRoutine({ skinType: 'Normal', age: 30 });
      expect(result).toBeDefined();
    });
  });

  describe('Utility logic inside private methods', () => {
    it('should infer categories correctly via fallback', async () => {
       // We force the fallback routine to run which uses inferCategoryFromText indirectly via getScrapedCatalog 
       // but since it's private, we can just test the whole fallback on specific names
       const mockScrapedData = [
        { name: 'Gel moussant', url: '1', description: '' },
        { name: 'Eau micellaire', url: '2', description: '' },
        { name: 'Sérum anti-âge', url: '3', description: '' },
        { name: 'Crème riche', url: '4', description: '' },
        { name: 'Ecran mineral SPF50', url: '5', description: '' },
        { name: 'Contour des yeux', url: '6', description: '' },
        { name: 'Masque purifiant', url: '7', description: '' },
        { name: 'Gommage doux', url: '8', description: '' },
        { name: 'Traitement ciblé', url: '9', description: '' }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockScrapedData));
      (openRouterService.generateSVRRoutine as jest.Mock).mockRejectedValueOnce(new Error('Force Fallback'));

      const result = await service.generateRoutine({ skinType: 'Oily', age: 25 });
      expect(result.recommendedProducts).toBeDefined();
    });
  });
});
