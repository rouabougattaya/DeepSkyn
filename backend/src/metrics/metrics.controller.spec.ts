import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { UnauthorizedException } from '@nestjs/common';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: any;

  const mockUser = { id: 'user-1' };
  const mockMetrics = {
    userId: 'user-1',
    mean: 75.5,
    median: 76,
    stdDev: 8.2,
    q1: 70,
    q3: 82,
    min: 45,
    max: 95,
    dataPoints: 42,
  };

  const mockTrends = [
    { period: '7d', trend: 2.5 },
    { period: '30d', trend: 1.8 },
    { period: '90d', trend: 0.5 },
  ];

  const mockMonthlyData = [
    { month: '2024-01', score: 72, count: 5 },
    { month: '2024-02', score: 75, count: 6 },
  ];

  beforeEach(async () => {
    metricsService = {
      getDashboardMetrics: jest.fn().mockResolvedValue(mockMetrics),
      getTrends: jest.fn().mockResolvedValue(mockTrends),
      getMonthlyData: jest.fn().mockResolvedValue(mockMonthlyData),
      seedDemoData: jest.fn().mockResolvedValue({ created: 180, months: 6 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: metricsService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return dashboard metrics for authenticated user', async () => {
      const result = await controller.getMetrics(mockUser);
      expect(result).toEqual(mockMetrics);
      expect(metricsService.getDashboardMetrics).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException when user is null', async () => {
      await expect(controller.getMetrics(null as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getTrends', () => {
    it('should return trends for authenticated user', async () => {
      const result = await controller.getTrends(mockUser);
      expect(result).toEqual(mockTrends);
      expect(metricsService.getTrends).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException when user is null', async () => {
      await expect(controller.getTrends(null as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMonthlyData', () => {
    it('should return monthly data with default 12 months', async () => {
      const result = await controller.getMonthlyData(mockUser);
      expect(result).toEqual(mockMonthlyData);
      expect(metricsService.getMonthlyData).toHaveBeenCalledWith(12, 'user-1');
    });

    it('should accept custom month count from query', async () => {
      await controller.getMonthlyData(mockUser, '6');
      expect(metricsService.getMonthlyData).toHaveBeenCalledWith(6, 'user-1');
    });

    it('should throw UnauthorizedException when user is null', async () => {
      await expect(controller.getMonthlyData(null as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('seedData', () => {
    it('should return seed result', async () => {
      const result = await controller.seedData();
      expect(result).toEqual({ created: 180, months: 6 });
      expect(metricsService.seedDemoData).toHaveBeenCalled();
    });
  });

  describe('ping', () => {
    it('should return pong', async () => {
      const result = await controller.ping();
      expect(result).toBe('pong');
    });
  });
});

