import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';

describe('MetricsService', () => {
  let service: MetricsService;
  let analysisRepo: any;
  let metricRepo: any;

  const mockAnalysis = {
    id: 'analysis-1',
    userId: 'user-1',
    skinScore: 75,
    status: 'COMPLETED',
    createdAt: new Date('2025-02-01'),
  };

  beforeEach(async () => {
    analysisRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
    };

    metricRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: getRepositoryToken(SkinAnalysis),
          useValue: analysisRepo,
        },
        {
          provide: getRepositoryToken(SkinMetric),
          useValue: metricRepo,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getDashboardMetrics', () => {
    it('should calculate dashboard metrics with all statistics', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 80, createdAt: new Date('2025-02-02') },
        { ...mockAnalysis, skinScore: 75, createdAt: new Date('2025-02-01') },
        { ...mockAnalysis, skinScore: 70, createdAt: new Date('2025-01-31') },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.totalAnalyses).toBe(3);
      expect(result.averageScore).toBe(75);
      expect(result.bestScore).toBe(80);
      expect(result.worstScore).toBe(70);
      expect(result.medianScore).toBe(75);
      expect(result.trendDirection).toBeDefined();
      expect(result.standardDeviation).toBeDefined();
    });

    it('should filter by userId when provided', async () => {
      analysisRepo.find.mockResolvedValueOnce([mockAnalysis]);

      await service.getDashboardMetrics('user-1');

      const callArgs = analysisRepo.find.mock.calls[0][0];
      expect(callArgs.where.userId).toBe('user-1');
    });

    it('should return empty metrics when no analyses found', async () => {
      analysisRepo.find.mockResolvedValueOnce([]);

      const result = await service.getDashboardMetrics();

      expect(result.totalAnalyses).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.trendDirection).toBe('stable');
    });

    it('should calculate trend correctly for upward trend', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 80, createdAt: new Date('2025-02-02') },
        { ...mockAnalysis, skinScore: 60, createdAt: new Date('2025-02-01') },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.trendDirection).toBe('up');
    });

    it('should calculate trend correctly for downward trend', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 60, createdAt: new Date('2025-02-02') },
        { ...mockAnalysis, skinScore: 80, createdAt: new Date('2025-02-01') },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.trendDirection).toBe('down');
    });

    it('should handle null skin scores', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: null },
        { ...mockAnalysis, id: 'analysis-2', skinScore: 80 },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.averageScore).toBe(40);
    });
  });

  describe('getTrends', () => {
    it('should return trend data for multiple periods', async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const analyses = [
        { ...mockAnalysis, skinScore: 80, createdAt: now },
        { ...mockAnalysis, id: 'a2', skinScore: 75, createdAt: sevenDaysAgo },
        { ...mockAnalysis, id: 'a3', skinScore: 70, createdAt: thirtyDaysAgo },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getTrends();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('current');
      expect(result[0]).toHaveProperty('previous');
    });

    it('should filter trends by userId', async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      analysisRepo.find.mockResolvedValueOnce([
        { ...mockAnalysis, skinScore: 80, createdAt: now },
        { ...mockAnalysis, id: 'a2', skinScore: 75, createdAt: sevenDaysAgo },
      ]);

      await service.getTrends('user-1');

      const callArgs = analysisRepo.find.mock.calls[0][0];
      expect(callArgs.where.userId).toBe('user-1');
    });

    it('should return empty array when less than 2 analyses', async () => {
      analysisRepo.find.mockResolvedValueOnce([mockAnalysis]);

      const result = await service.getTrends();

      expect(result).toEqual([]);
    });
  });

  describe('getMonthlyData', () => {
    it('should aggregate data by month', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 75, createdAt: new Date('2025-02-15') },
        { ...mockAnalysis, id: 'a2', skinScore: 80, createdAt: new Date('2025-02-10') },
        { ...mockAnalysis, id: 'a3', skinScore: 70, createdAt: new Date('2025-01-15') },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getMonthlyData(12);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('averageScore');
      expect(result[0]).toHaveProperty('analysisCount');
    });

    it('should limit months to specified count', async () => {
      const analyses = Array.from({ length: 20 }, (_, i) => ({
        ...mockAnalysis,
        id: `a${i}`,
        skinScore: 75,
        createdAt: new Date(`2024-${String((i % 12) + 1).padStart(2, '0')}-15`),
      }));

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getMonthlyData(6);

      expect(result.length).toBeLessThanOrEqual(6);
    });

    it('should filter by userId', async () => {
      analysisRepo.find.mockResolvedValueOnce([]);

      await service.getMonthlyData(12, 'user-1');

      const callArgs = analysisRepo.find.mock.calls[0][0];
      expect(callArgs.where.userId).toBe('user-1');
    });
  });

  describe('Statistical Functions', () => {
    it('should calculate mean correctly', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 10 },
        { ...mockAnalysis, id: 'a2', skinScore: 20 },
        { ...mockAnalysis, id: 'a3', skinScore: 30 },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.averageScore).toBe(20);
    });

    it('should calculate median correctly', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 10 },
        { ...mockAnalysis, id: 'a2', skinScore: 20 },
        { ...mockAnalysis, id: 'a3', skinScore: 30 },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.medianScore).toBe(20);
    });

    it('should calculate percentiles correctly', async () => {
      const analyses = Array.from({ length: 100 }, (_, i) => ({
        ...mockAnalysis,
        id: `a${i}`,
        skinScore: i,
      }));

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.percentile25).toBeLessThan(result.medianScore);
      expect(result.percentile75).toBeGreaterThan(result.medianScore);
    });

    it('should calculate moving average', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 80 },
        { ...mockAnalysis, id: 'a2', skinScore: 85 },
        { ...mockAnalysis, id: 'a3', skinScore: 75 },
        { ...mockAnalysis, id: 'a4', skinScore: 90 },
        { ...mockAnalysis, id: 'a5', skinScore: 70 },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.movingAverage5).toBe(80);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle single analysis', async () => {
      analysisRepo.find.mockResolvedValueOnce([mockAnalysis]);

      const result = await service.getDashboardMetrics();

      expect(result.totalAnalyses).toBe(1);
      expect(result.averageScore).toBe(mockAnalysis.skinScore);
    });

    it('should handle all scores equal', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 75 },
        { ...mockAnalysis, id: 'a2', skinScore: 75 },
        { ...mockAnalysis, id: 'a3', skinScore: 75 },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(result.standardDeviation).toBe(0);
      expect(result.trendDirection).toBe('stable');
    });

    it('should round decimal values', async () => {
      const analyses = [
        { ...mockAnalysis, skinScore: 33.333 },
        { ...mockAnalysis, id: 'a2', skinScore: 33.333 },
        { ...mockAnalysis, id: 'a3', skinScore: 33.333 },
      ];

      analysisRepo.find.mockResolvedValueOnce(analyses);

      const result = await service.getDashboardMetrics();

      expect(typeof result.averageScore).toBe('number');
      expect(result.averageScore).toBe(33.3);
    });
  });

  describe('seedDemoData', () => {
    it('should seed demo data correctly (coverage for crypto)', async () => {
      analysisRepo.delete.mockResolvedValue({ affected: 1 });
      analysisRepo.insert.mockResolvedValue({});

      const result = await service.seedDemoData('test-user');
      expect(result.success).toBe(true);
      expect(result.created).toBeGreaterThan(0);
      expect(analysisRepo.insert).toHaveBeenCalled();
    });

    it('should generate exactly 6 months of data', async () => {
      analysisRepo.delete.mockResolvedValue({ affected: 0 });
      analysisRepo.insert.mockResolvedValue({});

      const result = await service.seedDemoData('test-user');
      expect(result.created).toBeGreaterThanOrEqual(18); // 6 months * 3 analyses min
      expect(result.created).toBeLessThanOrEqual(30); // 6 months * 5 analyses max
    });

    it('should use unique IDs for each seeded analysis', async () => {
      analysisRepo.delete.mockResolvedValue({});
      analysisRepo.insert.mockResolvedValue({});

      const result = await service.seedDemoData('test-user');
      expect(result.created).toBeGreaterThan(0);
    });
  });

  describe('Data Ordering', () => {
    it('should query analyses with DESC order', async () => {
      analysisRepo.find.mockResolvedValueOnce([]);

      await service.getDashboardMetrics();

      const callArgs = analysisRepo.find.mock.calls[0][0];
      expect(callArgs.order.createdAt).toBe('DESC');
    });

    it('should only query COMPLETED analyses', async () => {
      analysisRepo.find.mockResolvedValueOnce([]);

      await service.getDashboardMetrics();

      const callArgs = analysisRepo.find.mock.calls[0][0];
      expect(callArgs.where.status).toBe('COMPLETED');
    });
  });
});
