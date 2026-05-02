import { Test, TestingModule } from '@nestjs/testing';
import { SkinAgeInsightsService } from './skin-age-insights.service';
import { SkinMetricService } from '../skinMetric/skin-metric.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { UserProfile } from '../userProfile/user-profile.entity';

describe('SkinAgeInsightsService', () => {
  let service: SkinAgeInsightsService;

  const mockSkinMetricService = {
    getUserSkinAgeSeries: jest.fn(),
  };

  const mockRecommendationService = {
    getRecommendationsForSkinState: jest.fn(),
  };

  const mockRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkinAgeInsightsService,
        { provide: SkinMetricService, useValue: mockSkinMetricService },
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: getRepositoryToken(UserProfile), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SkinAgeInsightsService>(SkinAgeInsightsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInsights', () => {
    it('should return default insights if no series found', async () => {
      mockSkinMetricService.getUserSkinAgeSeries.mockResolvedValueOnce([]);
      
      const res = await service.getInsights('u1');
      expect(res).toBeDefined();
      expect(res.status).toBe('unknown');
      expect(res.headline).toContain('Aucune analyse');
      expect(res.latestAnalysis).toBeUndefined();
    });

    it('should return younger insights if delta is <= -3', async () => {
      mockSkinMetricService.getUserSkinAgeSeries.mockResolvedValueOnce([
        { id: '1', createdAt: new Date(), skinAge: 25, realAge: 30, skinScore: 80, hydration: 60, acne: 10, wrinkles: 10, oil: 20 },
      ]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([{ id: 'prod1' }]);
      
      const res = await service.getInsights('u1');
      expect(res).toBeDefined();
      expect(res.status).toBe('younger');
      expect(res.delta).toBe(-5);
      expect(res.headline).toContain('younger');
      expect(res.products).toHaveLength(1);
    });

    it('should return older insights if delta is >= 4', async () => {
      mockSkinMetricService.getUserSkinAgeSeries.mockResolvedValueOnce([
        { id: '1', createdAt: new Date(), skinAge: 35, realAge: 30, skinScore: 50, hydration: 20, acne: 10, wrinkles: 60, oil: 20 },
      ]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([]);
      
      const res = await service.getInsights('u1');
      expect(res).toBeDefined();
      expect(res.status).toBe('older');
      expect(res.delta).toBe(5);
      expect(res.headline).toContain('higher');
    });

    it('should return aligned insights if delta is between -2 and 3', async () => {
      mockSkinMetricService.getUserSkinAgeSeries.mockResolvedValueOnce([
        { id: '1', createdAt: new Date(), skinAge: 31, realAge: 30, skinScore: 70, hydration: 50, acne: 20, wrinkles: 30, oil: 30 },
      ]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([]);
      
      const res = await service.getInsights('u1');
      expect(res).toBeDefined();
      expect(res.status).toBe('aligned');
      expect(res.delta).toBe(1);
      expect(res.headline).toContain('matches your real age');
    });
  });

  describe('inferSkinType logic coverage via getInsights', () => {
    it('should cover oily skin type inference', async () => {
      mockSkinMetricService.getUserSkinAgeSeries.mockResolvedValueOnce([
        { id: '1', createdAt: new Date(), skinAge: 30, realAge: 30, skinScore: 70, hydration: 50, acne: 70, wrinkles: 30, oil: 80 },
      ]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([]);
      await service.getInsights('u1');
      expect(mockRecommendationService.getRecommendationsForSkinState).toHaveBeenCalledWith('u1', '1', 'Oily');
    });

    it('should cover dry skin type inference', async () => {
      mockSkinMetricService.getUserSkinAgeSeries.mockResolvedValueOnce([
        { id: '1', createdAt: new Date(), skinAge: 30, realAge: 30, skinScore: 70, hydration: 20, acne: 10, wrinkles: 70, oil: 10 },
      ]);
      mockRecommendationService.getRecommendationsForSkinState.mockResolvedValueOnce([]);
      await service.getInsights('u1');
      expect(mockRecommendationService.getRecommendationsForSkinState).toHaveBeenCalledWith('u1', '1', 'Dry');
    });
  });
});
