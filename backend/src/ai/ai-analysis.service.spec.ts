import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalysisService } from './ai-analysis.service';
import { FakeAiService } from './fake-ai.service';
import { DetectionAdapterService } from './detection-adapter.service';
import { ScoringEngineService } from './scoring-engine.service';
import { OpenRouterService } from './openrouter.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { IncompatibilityService } from '../routine/incompatibility.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import { UserProfile } from '../userProfile/user-profile.entity';
import { SkinCondition } from './skin-condition.enum';

describe('AiAnalysisService', () => {
  let service: AiAnalysisService;
  
  // Mocks
  const mockFakeAiService = {
    analyzeImage: jest.fn(),
    generateTestCase: jest.fn(),
    generateRandomDetections: jest.fn(),
  };
  
  const mockDetectionAdapter = {
    validateDetections: jest.fn(),
    aggregateDetections: jest.fn(),
  };
  
  const mockScoringEngine = {
    computeConditionScores: jest.fn(),
    calculateGlobalScore: jest.fn(),
    getDefaultWeights: jest.fn(),
    validateWeights: jest.fn(),
  };
  
  const mockOpenRouterService = {
    analyzeSkin: jest.fn(),
    estimateSkinAge: jest.fn(),
    predictFutureSkinState: jest.fn(),
  };
  
  const mockRecommendationService = {
    getRecommendationsForSkinState: jest.fn(),
  };
  
  const mockIncompatibilityService = {
    checkRoutine: jest.fn(),
  };
  
  const mockSubscriptionService = {
    checkAnalysisLimit: jest.fn(),
    getSubscription: jest.fn(),
    incrementImages: jest.fn(),
  };
  
  const mockAnalysisRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };
  
  const mockMetricRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };
  
  const mockProfileRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Default mock behaviors
    mockSubscriptionService.checkAnalysisLimit.mockResolvedValue({ allowed: true });
    mockSubscriptionService.getSubscription.mockResolvedValue({ plan: 'FREE' });
    mockIncompatibilityService.checkRoutine.mockReturnValue({ message: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAnalysisService,
        { provide: FakeAiService, useValue: mockFakeAiService },
        { provide: DetectionAdapterService, useValue: mockDetectionAdapter },
        { provide: ScoringEngineService, useValue: mockScoringEngine },
        { provide: OpenRouterService, useValue: mockOpenRouterService },
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: IncompatibilityService, useValue: mockIncompatibilityService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: getRepositoryToken(SkinAnalysis), useValue: mockAnalysisRepo },
        { provide: getRepositoryToken(SkinMetric), useValue: mockMetricRepo },
        { provide: getRepositoryToken(UserProfile), useValue: mockProfileRepo },
      ],
    }).compile();

    service = module.get<AiAnalysisService>(AiAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeImage (Legacy/FakeAI path)', () => {
    it('should throw an error if analysis limit is reached', async () => {
      mockSubscriptionService.checkAnalysisLimit.mockResolvedValueOnce({ allowed: false });
      
      await expect(service.analyzeImage('image-1', {}, undefined, 'user-1'))
        .rejects.toThrow('AI analysis failed: LIMIT_REACHED');
    });

    it('should throw an error if detections are invalid', async () => {
      mockFakeAiService.analyzeImage.mockResolvedValueOnce([]);
      mockDetectionAdapter.validateDetections.mockReturnValueOnce(false);
      
      await expect(service.analyzeImage('image-1', {}, undefined, 'user-1'))
        .rejects.toThrow('AI analysis failed: Invalid detection format from AI model');
    });

    it('should run a successful analysis without userId (Guest Mode)', async () => {
      mockFakeAiService.analyzeImage.mockResolvedValueOnce([{ type: 'acne' }]);
      mockDetectionAdapter.validateDetections.mockReturnValueOnce(true);
      mockDetectionAdapter.aggregateDetections.mockReturnValueOnce([]);
      mockScoringEngine.computeConditionScores.mockReturnValueOnce([]);
      mockScoringEngine.calculateGlobalScore.mockReturnValueOnce({
        globalScore: 80,
        analysis: { dominantCondition: SkinCondition.ACNE }
      });
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([{ id: 1, name: 'SVR' }]);

      const result = await service.analyzeImage('image-1');
      
      expect(result.globalScore).toBe(80);
      expect(result.recommendations).toBeDefined();
      expect(mockAnalysisRepo.save).not.toHaveBeenCalled(); // Guest mode = no save
      expect(mockSubscriptionService.incrementImages).not.toHaveBeenCalled();
    });

    it('should run a successful analysis and save for authenticated user', async () => {
      mockFakeAiService.analyzeImage.mockResolvedValueOnce([{ type: 'wrinkles' }]);
      mockDetectionAdapter.validateDetections.mockReturnValueOnce(true);
      mockDetectionAdapter.aggregateDetections.mockReturnValueOnce([]);
      mockScoringEngine.computeConditionScores.mockReturnValueOnce([
        { type: SkinCondition.WRINKLES, score: 30, severity: 0.7 }
      ]);
      mockScoringEngine.calculateGlobalScore.mockReturnValueOnce({
        globalScore: 60,
        conditionScores: [{ type: SkinCondition.WRINKLES, score: 30 }]
      });
      
      mockAnalysisRepo.create.mockReturnValueOnce({ id: 'analysis-123' });
      mockAnalysisRepo.save.mockResolvedValueOnce({ id: 'analysis-123' });
      mockMetricRepo.create.mockReturnValue({ id: 'metric-1' });
      
      await service.analyzeImage('image-1', {}, undefined, 'user-1', 30);
      
      expect(mockAnalysisRepo.save).toHaveBeenCalled();
      expect(mockMetricRepo.save).toHaveBeenCalled();
      expect(mockSubscriptionService.incrementImages).toHaveBeenCalledWith('user-1');
    });
  });

  describe('analyzeSkinWithLLM (OpenRouter path)', () => {
    const mockProfile = {
      skinType: 'Dry' as const,
      age: 30,
      imageBase64: 'base64...',
      acneLevel: 10,
    };

    it('should throw LIMIT_REACHED if user has no credits', async () => {
      mockSubscriptionService.checkAnalysisLimit.mockResolvedValueOnce({ allowed: false });
      
      await expect(service.analyzeSkinWithLLM(mockProfile, 'user-1'))
        .rejects.toThrow('LLM Analysis failed: LIMIT_REACHED');
    });

    it('should successfully analyze skin and merge results', async () => {
      mockOpenRouterService.analyzeSkin.mockResolvedValueOnce({
        globalScore: 0, // Will be recalculated
        conditionScores: [
          { type: SkinCondition.ACNE, evaluated: true, score: 90 }
        ]
      });
      mockOpenRouterService.estimateSkinAge.mockResolvedValueOnce({ skinAge: 32, rationale: 'Looks older' });
      
      mockAnalysisRepo.create.mockReturnValueOnce({ id: 'analysis-llm-1' });
      mockAnalysisRepo.save.mockResolvedValueOnce({ id: 'analysis-llm-1' });
      mockMetricRepo.create.mockReturnValue({});
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([{ id: 2, name: 'SVR Rich' }]);

      const result = await service.analyzeSkinWithLLM(mockProfile, 'user-1');

      expect(mockOpenRouterService.analyzeSkin).toHaveBeenCalledWith(mockProfile, 'FREE');
      expect(result.skinAge).toBe(32);
      expect(mockAnalysisRepo.save).toHaveBeenCalled();
      expect(mockSubscriptionService.incrementImages).toHaveBeenCalledWith('user-1');
    });

    it('should calculate fallback skinAge if LLM estimation fails', async () => {
      mockOpenRouterService.analyzeSkin.mockResolvedValueOnce({
        globalScore: 80,
        conditionScores: []
      });
      mockOpenRouterService.estimateSkinAge.mockRejectedValueOnce(new Error('LLM error'));

      const result = await service.analyzeSkinWithLLM(mockProfile);

      // Baseline = 30, Normalized = 0 (because conditionScores is empty) -> Adjustment = (50 - 0) / 5 = +10
      // SkinAge = 30 + 10 = 40
      expect(result.skinAge).toBe(40);
    });

    it('should handle analysis without photo (user input only)', async () => {
      const profileNoPhoto = { ...mockProfile, imageBase64: undefined, acneLevel: 80 };
      mockOpenRouterService.analyzeSkin.mockResolvedValueOnce({
        globalScore: 0,
        conditionScores: []
      });
      
      const result = await service.analyzeSkinWithLLM(profileNoPhoto, 'user-1');
      
      expect(result.metaWeighting.userWeight).toBe(1);
      expect(result.metaWeighting.aiWeight).toBe(0);
      expect(result.conditionScores.some(c => c.type === SkinCondition.ACNE && c.evaluated === true)).toBe(true);
    });
  });

  describe('analyzeWithRandomDetections', () => {
    it('should generate random detections and save if userId exists', async () => {
      mockFakeAiService.generateRandomDetections.mockReturnValueOnce([{ class: 'Acne', confidence: 0.9 }]);
      mockDetectionAdapter.aggregateDetections.mockReturnValueOnce([]);
      mockScoringEngine.computeConditionScores.mockReturnValueOnce([]);
      mockScoringEngine.calculateGlobalScore.mockReturnValueOnce({ globalScore: 75, conditionScores: [] });
      
      await service.analyzeWithRandomDetections(123, {}, 'user-1');
      
      expect(mockAnalysisRepo.save).toHaveBeenCalled();
    });

    it('should not save if userId is missing', async () => {
      mockFakeAiService.generateRandomDetections.mockReturnValueOnce([]);
      mockScoringEngine.calculateGlobalScore.mockReturnValueOnce({ globalScore: 75 });
      
      await service.analyzeWithRandomDetections(123);
      
      expect(mockAnalysisRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('predictFutureSkin', () => {
    it('should return prediction from OpenRouter', async () => {
      mockOpenRouterService.predictFutureSkinState.mockResolvedValueOnce({ skinAge: 40 });
      const result = await service.predictFutureSkin('Context...');
      expect(result).toEqual({ skinAge: 40 });
    });

    it('should return empty object on failure', async () => {
      mockOpenRouterService.predictFutureSkinState.mockRejectedValueOnce(new Error('Failed'));
      const result = await service.predictFutureSkin('Context...');
      expect(result).toEqual({});
    });
  });

  describe('Utility Methods', () => {
    it('should proxy getDefaultWeights', () => {
      service.getDefaultWeights();
      expect(mockScoringEngine.getDefaultWeights).toHaveBeenCalled();
    });

    it('should proxy validateWeights', () => {
      service.validateWeights({});
      expect(mockScoringEngine.validateWeights).toHaveBeenCalled();
    });
  });
});
