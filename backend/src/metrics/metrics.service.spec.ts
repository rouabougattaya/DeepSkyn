import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';

describe('MetricsService', () => {
  let service: MetricsService;
  let analysisRepo: any;

  beforeEach(async () => {
    analysisRepo = {
      find: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
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
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should seed demo data correctly (coverage for crypto)', async () => {
    analysisRepo.delete.mockResolvedValue({ affected: 1 });
    analysisRepo.insert.mockResolvedValue({});

    const result = await service.seedDemoData('test-user');
    expect(result.success).toBe(true);
    expect(result.created).toBeGreaterThan(0);
    expect(analysisRepo.insert).toHaveBeenCalled();
  });
});
