import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { SkinMetricService } from './skin-metric.service';
import { SkinMetric } from './skin-metric.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { ScoringService } from '../scoring.service';
import { WeightsDto } from '../weights.dto';

describe('SkinMetricService', () => {
  let service: SkinMetricService;
  let mockMetricRepo;
  let mockAnalysisRepo;
  let mockScoringService;

  const mockWeights: WeightsDto = {
    acne: 0.25,
    oil: 0.25,
    hydration: 0.25,
    wrinkles: 0.25,
  };

  const mockMetric = {
    id: 'metric-1',
    analysisId: 'analysis-1',
    metricType: 'acne',
    score: 75,
  };

  const mockAnalysis = {
    id: 'analysis-1',
    userId: 'user-1',
    skinScore: 0,
    status: 'COMPLETED',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockMetricRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    mockAnalysisRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
    };

    mockScoringService = {
      calculateGlobalScore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkinMetricService,
        {
          provide: getRepositoryToken(SkinMetric),
          useValue: mockMetricRepo,
        },
        {
          provide: getRepositoryToken(SkinAnalysis),
          useValue: mockAnalysisRepo,
        },
        {
          provide: ScoringService,
          useValue: mockScoringService,
        },
      ],
    }).compile();

    service = module.get<SkinMetricService>(SkinMetricService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMetric', () => {
    it('should update metric and recalculate analysis score', async () => {
      mockMetricRepo.findOne.mockResolvedValueOnce(mockMetric);
      mockAnalysisRepo.findOne.mockResolvedValueOnce(mockAnalysis);
      mockMetricRepo.find.mockResolvedValueOnce([mockMetric]);
      mockScoringService.calculateGlobalScore.mockReturnValueOnce(80);

      const result = await service.updateMetric('metric-1', 85, mockWeights);

      expect(result.score).toBe(85);
      expect(mockMetricRepo.save).toHaveBeenCalled();
      expect(mockScoringService.calculateGlobalScore).toHaveBeenCalled();
    });

    it('should throw error if metric not found', async () => {
      mockMetricRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.updateMetric('invalid-id', 85, mockWeights)).rejects.toThrow('Metric not found');
    });

    it('should throw error if analysis not found during recalculation', async () => {
      mockMetricRepo.findOne.mockResolvedValueOnce(mockMetric);
      mockAnalysisRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.updateMetric('metric-1', 85, mockWeights)).rejects.toThrow('Analysis not found');
    });
  });

  describe('recalculateAnalysisScore', () => {
    it('should calculate and save updated score', async () => {
      const metrics = [
        { ...mockMetric, metricType: 'acne', score: 75 },
        { ...mockMetric, id: 'metric-2', metricType: 'oil', score: 80 },
      ];

      mockAnalysisRepo.findOne.mockResolvedValueOnce(mockAnalysis);
      mockMetricRepo.find.mockResolvedValueOnce(metrics);
      mockScoringService.calculateGlobalScore.mockReturnValueOnce(78);

      const result = await service.recalculateAnalysisScore('analysis-1', mockWeights);

      expect(result).toBe(78);
      expect(mockAnalysisRepo.save).toHaveBeenCalled();
    });

    it('should throw error if analysis not found', async () => {
      mockAnalysisRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.recalculateAnalysisScore('invalid-id', mockWeights)).rejects.toThrow('Analysis not found');
    });
  });

  describe('getUserAnalyses', () => {
    it('should return paginated user analyses', async () => {
      const analyses = [
        { ...mockAnalysis, id: 'a1', createdAt: new Date(), skinScore: 75 },
        { ...mockAnalysis, id: 'a2', createdAt: new Date('2025-01-01'), skinScore: 70 },
      ];

      mockAnalysisRepo.findAndCount.mockResolvedValueOnce([analyses, 2]);

      const result = await service.getUserAnalyses('user-1', 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockAnalysisRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          order: { createdAt: 'DESC' },
        })
      );
    });

    it('should apply pagination correctly', async () => {
      mockAnalysisRepo.findAndCount.mockResolvedValueOnce([[], 5]);

      await service.getUserAnalyses('user-1', 2, 10);

      const callArgs = mockAnalysisRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.skip).toBe(10); // (2-1) * 10
      expect(callArgs.take).toBe(10);
    });

    it('should throw UnauthorizedException for missing userId', async () => {
      await expect(service.getUserAnalyses('', 1, 10)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid userId type', async () => {
      await expect(service.getUserAnalyses(null as any, 1, 10)).rejects.toThrow(UnauthorizedException);
    });

    it('should return empty data when no analyses found', async () => {
      mockAnalysisRepo.findAndCount.mockResolvedValueOnce([[], 0]);

      const result = await service.getUserAnalyses('user-1', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should format analysis data correctly with skin score', async () => {
      const analyses = [
        { 
          id: 'a1', 
          createdAt: new Date('2025-02-01'), 
          skinScore: 85 
        },
      ];

      mockAnalysisRepo.findAndCount.mockResolvedValueOnce([analyses, 1]);

      const result = await service.getUserAnalyses('user-1', 1, 10);

      expect(result.data[0]).toEqual({
        id: 'a1',
        createdAt: analyses[0].createdAt,
        skinScore: 85,
      });
    });
  });

  describe('getUserSkinAgeSeries', () => {
    it('should return skin age series data', async () => {
      const analyses = [
        {
          id: 'a1',
          createdAt: new Date(),
          skinAge: 28,
          realAge: 30,
          skinScore: 75,
          acne: 80,
          oil: 70,
          hydration: 65,
          wrinkles: 60,
          aiRawResponse: { realAgeSource: 'analysis-input' },
        },
      ];

      mockAnalysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getUserSkinAgeSeries('user-1', 5);

      expect(result).toHaveLength(1);
      expect(result[0].skinAge).toBe(28);
      expect(result[0].realAge).toBe(30);
    });

    it('should apply limit correctly', async () => {
      mockAnalysisRepo.find.mockResolvedValueOnce([]);

      await service.getUserSkinAgeSeries('user-1', 3);

      const callArgs = mockAnalysisRepo.find.mock.calls[0][0];
      expect(callArgs.take).toBe(3);
    });

    it('should order by createdAt DESC', async () => {
      mockAnalysisRepo.find.mockResolvedValueOnce([]);

      await service.getUserSkinAgeSeries('user-1', 5);

      const callArgs = mockAnalysisRepo.find.mock.calls[0][0];
      expect(callArgs.order).toEqual({ createdAt: 'DESC' });
    });
  });

  describe('Mathematical Calculations - Edge Cases', () => {
    it('should handle analyses with missing scores', async () => {
      mockAnalysisRepo.findAndCount.mockResolvedValueOnce([
        [{ id: 'a1', createdAt: new Date(), skinScore: null }],
        1
      ]);

      const result = await service.getUserAnalyses('user-1', 1, 10);

      expect(result.data[0].skinScore).toBe(0);
    });

    it('should handle zero values in scoring', async () => {
      const metrics = [
        { metricType: 'acne', score: 0 },
        { metricType: 'oil', score: 0 },
        { metricType: 'hydration', score: 0 },
        { metricType: 'wrinkles', score: 0 },
      ];

      mockAnalysisRepo.findOne.mockResolvedValueOnce(mockAnalysis);
      mockMetricRepo.find.mockResolvedValueOnce(metrics);
      mockScoringService.calculateGlobalScore.mockReturnValueOnce(0);

      const result = await service.recalculateAnalysisScore('analysis-1', mockWeights);

      expect(result).toBe(0);
    });

    it('should handle extreme values (100)', async () => {
      const metrics = [
        { metricType: 'acne', score: 100 },
        { metricType: 'oil', score: 100 },
      ];

      mockAnalysisRepo.findOne.mockResolvedValueOnce(mockAnalysis);
      mockMetricRepo.find.mockResolvedValueOnce(metrics);
      mockScoringService.calculateGlobalScore.mockReturnValueOnce(100);

      const result = await service.recalculateAnalysisScore('analysis-1', mockWeights);

      expect(result).toBe(100);
    });
  });
});
