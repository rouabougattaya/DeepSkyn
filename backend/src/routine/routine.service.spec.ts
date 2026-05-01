import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutineService } from './routine.service';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { Product } from '../products/entities/product.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RecommendationService } from '../recommendation/recommendation.service';
import { IncompatibilityService } from './incompatibility.service';
import { OpenRouterService } from '../ai/openrouter.service';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('RoutineService', () => {
  let service: RoutineService;
  let skinAnalysisRepo: ReturnType<typeof mockRepo>;
  let routineRepo: ReturnType<typeof mockRepo>;
  let routineStepRepo: ReturnType<typeof mockRepo>;
  let productRepo: ReturnType<typeof mockRepo>;

  const mockRecommendationService = {
    getRecommendationsForAnalysis: jest.fn(),
    getLatestFinalRecommendationsForUser: jest.fn(),
    getRecommendationsForSkinState: jest.fn(),
  };

  const mockIncompatibilityService = {
    checkRoutine: jest.fn(),
  };

  const mockOpenRouterService = {
    generateRoutineFromRecommendations: jest.fn(),
  };

  const sampleProduct = {
    id: 'prod-1',
    name: 'CeraVe Cleanser',
    type: 'Cleanser',
    price: 15,
    url: 'https://cerave.com',
    skinType: 'normal',
  };

  const sampleAnalysis = {
    id: 'analysis-1',
    userId: 'user-1',
    status: 'COMPLETED',
    oil: 30,
    acne: 30,
    wrinkles: 30,
    hydration: 70,
    skinScore: 80,
    skinAge: 25,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    skinAnalysisRepo = mockRepo();
    routineRepo = mockRepo();
    routineStepRepo = mockRepo();
    productRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutineService,
        { provide: getRepositoryToken(Routine), useValue: routineRepo },
        { provide: getRepositoryToken(RoutineStep), useValue: routineStepRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(SkinAnalysis), useValue: skinAnalysisRepo },
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: IncompatibilityService, useValue: mockIncompatibilityService },
        { provide: OpenRouterService, useValue: mockOpenRouterService },
      ],
    }).compile();

    service = module.get<RoutineService>(RoutineService);
    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('getOrGenerateRoutine — happy path (peau normale)', () => {
    it('devrait générer une routine AM/PM en utilisant les recommandations existantes', async () => {
      const recommendations = [
        { id: 'r1', name: 'CeraVe Cleanser', type: 'Cleanser', price: 15, url: 'https://cerave.com' },
        { id: 'r2', name: 'Niacinamide Serum', type: 'Serum', price: 20, url: 'https://serum.com' },
        { id: 'r3', name: 'Moisturizer Plus', type: 'Moisturizer', price: 25, url: 'https://moisturizer.com' },
      ];

      skinAnalysisRepo.findOne.mockResolvedValue(sampleAnalysis);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue(recommendations);
      mockOpenRouterService.generateRoutineFromRecommendations.mockResolvedValue(null);

      const amRoutine = { id: 'am-routine', userId: 'user-1', type: 'AM' };
      const pmRoutine = { id: 'pm-routine', userId: 'user-1', type: 'PM' };
      routineRepo.create
        .mockReturnValueOnce(amRoutine)
        .mockReturnValueOnce(pmRoutine);
      routineRepo.save
        .mockResolvedValueOnce(amRoutine)
        .mockResolvedValueOnce(pmRoutine);

      productRepo.findOne.mockResolvedValue(sampleProduct);
      routineStepRepo.create.mockReturnValue({ routineId: 'am-routine', productId: 'prod-1', stepOrder: 1 });
      routineStepRepo.save.mockResolvedValue([]);

      routineStepRepo.find.mockResolvedValue([
        { routineId: 'am-routine', productId: 'prod-1', stepOrder: 1, notes: 'Nettoyer' },
      ]);
      productRepo.find.mockResolvedValue([sampleProduct]);

      mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true, message: undefined });

      const result = await service.getOrGenerateRoutine('user-1');

      expect(result).toHaveProperty('morning');
      expect(result).toHaveProperty('night');
      expect(skinAnalysisRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'COMPLETED' } }),
      );
    });
  });

  describe('getOrGenerateRoutine — fallback sans analyse', () => {
    it('devrait utiliser les recommandations globales si aucune analyse n\'est disponible', async () => {
      skinAnalysisRepo.findOne.mockResolvedValue(null);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue([]);
      mockRecommendationService.getLatestFinalRecommendationsForUser.mockResolvedValue([]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValue([]);
      mockOpenRouterService.generateRoutineFromRecommendations.mockResolvedValue(null);

      const amRoutine = { id: 'am-2', userId: 'user-2', type: 'AM' };
      const pmRoutine = { id: 'pm-2', userId: 'user-2', type: 'PM' };
      routineRepo.create.mockReturnValueOnce(amRoutine).mockReturnValueOnce(pmRoutine);
      routineRepo.save.mockResolvedValueOnce(amRoutine).mockResolvedValueOnce(pmRoutine);

      routineStepRepo.find.mockResolvedValue([]);
      productRepo.find.mockResolvedValue([]);
      mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true, message: undefined });

      const result = await service.getOrGenerateRoutine('user-2');

      expect(result.morning.steps).toEqual([]);
      expect(result.night.steps).toEqual([]);
    });
  });

  describe('inférence du type de peau', () => {
    it('devrait inférer "Oily" si oil >= 65', async () => {
      const oilyAnalysis = { ...sampleAnalysis, oil: 70, acne: 20, wrinkles: 20, hydration: 70 };
      skinAnalysisRepo.findOne.mockResolvedValue(oilyAnalysis);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue([]);
      mockRecommendationService.getLatestFinalRecommendationsForUser.mockResolvedValue([]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValue([]);
      mockOpenRouterService.generateRoutineFromRecommendations.mockResolvedValue(null);

      routineRepo.create.mockReturnValue({ id: 'r', type: 'AM' });
      routineRepo.save.mockResolvedValue({ id: 'r', type: 'AM' });
      routineStepRepo.find.mockResolvedValue([]);
      productRepo.find.mockResolvedValue([]);
      mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true, message: undefined });

      // getRecommendationsForSkinState doit être appelé avec 'Oily'
      await service.getOrGenerateRoutine('user-oily');
      expect(mockRecommendationService.getRecommendationsForSkinState).toHaveBeenCalledWith(
        'user-oily',
        expect.any(String),
        'Oily',
      );
    });

    it('devrait inférer "Dry" si wrinkles >= 65', async () => {
      const dryAnalysis = { ...sampleAnalysis, oil: 20, acne: 20, wrinkles: 70, hydration: 70 };
      skinAnalysisRepo.findOne.mockResolvedValue(dryAnalysis);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue([]);
      mockRecommendationService.getLatestFinalRecommendationsForUser.mockResolvedValue([]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValue([]);
      mockOpenRouterService.generateRoutineFromRecommendations.mockResolvedValue(null);

      routineRepo.create.mockReturnValue({ id: 'r', type: 'AM' });
      routineRepo.save.mockResolvedValue({ id: 'r', type: 'AM' });
      routineStepRepo.find.mockResolvedValue([]);
      productRepo.find.mockResolvedValue([]);
      mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true, message: undefined });

      await service.getOrGenerateRoutine('user-dry');
      expect(mockRecommendationService.getRecommendationsForSkinState).toHaveBeenCalledWith(
        'user-dry',
        expect.any(String),
        'Dry',
      );
    });
  });

  describe('getOrGenerateRoutine — incompatibilité produits', () => {
    it('devrait inclure un avertissement si les produits sont incompatibles', async () => {
      skinAnalysisRepo.findOne.mockResolvedValue(sampleAnalysis);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue([
        { id: 'r1', name: 'Cleanser A', type: 'Cleanser', price: 10, url: null },
      ]);
      mockOpenRouterService.generateRoutineFromRecommendations.mockResolvedValue(null);

      routineRepo.create.mockReturnValue({ id: 'r', type: 'AM' });
      routineRepo.save.mockResolvedValue({ id: 'r', type: 'AM' });
      productRepo.findOne.mockResolvedValue(sampleProduct);
      routineStepRepo.create.mockReturnValue({});
      routineStepRepo.save.mockResolvedValue([]);
      routineStepRepo.find.mockResolvedValue([{ productId: 'prod-1', stepOrder: 1 }]);
      productRepo.find.mockResolvedValue([sampleProduct]);

      mockIncompatibilityService.checkRoutine.mockReturnValue({
        compatible: false,
        message: '⚠️ Rétinol + Vitamine C : éviter de combiner le soir.',
      });

      const result = await service.getOrGenerateRoutine('user-incompat');
      expect(result.compatibilityWarning).toContain('Rétinol');
    });
  });

  describe('getOrGenerateRoutine — routine générée par IA', () => {
    it('devrait utiliser la routine IA si OpenRouter retourne un résultat valide', async () => {
      const recommendations = [
        { id: 'r1', name: 'Gentle Cleanser', type: 'Cleanser', price: 12, url: null },
        { id: 'r2', name: 'Hydra Serum', type: 'Serum', price: 22, url: null },
      ];
      const aiRoutine = {
        morning: [
          { productName: 'Gentle Cleanser', stepName: 'Cleanser', instruction: 'Matin', reason: 'Douceur' },
        ],
        night: [],
      };

      skinAnalysisRepo.findOne.mockResolvedValue(sampleAnalysis);
      mockRecommendationService.getRecommendationsForAnalysis.mockResolvedValue(recommendations);
      mockOpenRouterService.generateRoutineFromRecommendations.mockResolvedValue(aiRoutine);

      routineRepo.create.mockReturnValue({ id: 'r', type: 'AM' });
      routineRepo.save.mockResolvedValue({ id: 'r', type: 'AM' });
      productRepo.findOne.mockResolvedValue(sampleProduct);
      routineStepRepo.create.mockReturnValue({});
      routineStepRepo.save.mockResolvedValue([]);
      routineStepRepo.find.mockResolvedValue([{ productId: 'prod-1', stepOrder: 1 }]);
      productRepo.find.mockResolvedValue([sampleProduct]);
      mockIncompatibilityService.checkRoutine.mockReturnValue({ compatible: true, message: undefined });

      const result = await service.getOrGenerateRoutine('user-ai');
      expect(mockOpenRouterService.generateRoutineFromRecommendations).toHaveBeenCalled();
      expect(result).toHaveProperty('morning');
    });
  });
});
