import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutinePersonalizationService } from './routine-personalization.service';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { Product } from '../products/entities/product.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RoutinePersonalization } from './routine-personalization.entity';
import { RecommendationService } from '../recommendation/recommendation.service';
import { InsightsService } from '../insights/insights.service';
import { IncompatibilityService } from './incompatibility.service';

describe('RoutinePersonalizationService', () => {
  let service: RoutinePersonalizationService;
  let analysisRepo: any;
  let personalizationRepo: any;
  let routineRepo: any;
  let stepRepo: any;
  let productRepo: any;

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockRecommendationService = {
    getRecommendationsForAnalysis: jest.fn(),
    getRecommendationsForSkinState: jest.fn(),
  };

  const mockInsightsService = {};
  
  const mockIncompatibilityService = {
    checkRoutine: jest.fn(),
  };

  beforeEach(async () => {
    analysisRepo = mockRepo();
    personalizationRepo = mockRepo();
    routineRepo = mockRepo();
    stepRepo = mockRepo();
    productRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutinePersonalizationService,
        { provide: getRepositoryToken(Routine), useValue: routineRepo },
        { provide: getRepositoryToken(RoutineStep), useValue: stepRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(SkinAnalysis), useValue: analysisRepo },
        { provide: getRepositoryToken(RoutinePersonalization), useValue: personalizationRepo },
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: InsightsService, useValue: mockInsightsService },
        { provide: IncompatibilityService, useValue: mockIncompatibilityService },
      ],
    }).compile();

    service = module.get<RoutinePersonalizationService>(RoutinePersonalizationService);
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('personalizeRoutine', () => {
    it('devrait générer une routine personnalisée basée sur les tendances', async () => {
      const mockAnalyses = [
        { id: '1', hydration: 50, oil: 40, acne: 30, wrinkles: 20, skinScore: 70, status: 'COMPLETED' },
        { id: '2', hydration: 60, oil: 50, acne: 20, wrinkles: 10, skinScore: 80, status: 'COMPLETED' },
      ];
      analysisRepo.find.mockResolvedValue(mockAnalyses);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue([]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValue([
        { id: 'p1', name: 'Product 1', type: 'Cleanser' }
      ]);
      
      routineRepo.create.mockReturnValue({ id: 'r1' });
      routineRepo.save.mockResolvedValue({ id: 'r1' });
      stepRepo.create.mockReturnValue({ id: 's1' });
      stepRepo.save.mockResolvedValue({ id: 's1' });
      personalizationRepo.create.mockReturnValue({ id: 'per1' });
      personalizationRepo.save.mockResolvedValue({ id: 'per1' });
      productRepo.findOne.mockResolvedValue({ id: 'p1', name: 'Product 1', type: 'Cleanser' });
      productRepo.find.mockResolvedValue([{ id: 'p1' }]);
      mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true, message: 'OK' });

      const result = await service.personalizeRoutine('user-1', {});

      expect(result.message).toBe('Routine personnalisée mise à jour avec succès.');
      expect(result.inferredSkinType).toBeDefined();
      expect(personalizationRepo.save).toHaveBeenCalled();
    });

    it('devrait appliquer des règles d ajustement si l acné empire', async () => {
        const mockAnalyses = [
            { id: '1', hydration: 50, oil: 40, acne: 60, wrinkles: 20, skinScore: 60, status: 'COMPLETED' }, // Latest (worse acne)
            { id: '2', hydration: 50, oil: 40, acne: 30, wrinkles: 20, skinScore: 70, status: 'COMPLETED' }, // Previous
        ];
        analysisRepo.find.mockResolvedValue(mockAnalyses);
        mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue([]);
        mockRecommendationService.getRecommendationsForSkinState.mockResolvedValue([]);
        
        routineRepo.create.mockReturnValue({ id: 'r1' });
        routineRepo.save.mockResolvedValue({ id: 'r1' });
        personalizationRepo.create.mockReturnValue({ id: 'per1' });
        personalizationRepo.save.mockResolvedValue({ id: 'per1' });
        productRepo.find.mockResolvedValue([]);
        mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true });

        const result = await service.personalizeRoutine('user-1', {});

        const acneAdjustment = result.adjustments.find(a => a.rule === 'ACNE_WORSENING');
        expect(acneAdjustment).toBeDefined();
        expect(acneAdjustment?.action).toContain('anti-acné');
    });
  });
});
