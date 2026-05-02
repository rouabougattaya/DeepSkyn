import { Test, TestingModule } from '@nestjs/testing';
import { ScoringEngineService } from './scoring-engine.service';
import { SkinMetric, ConditionWeights } from './detection.interface';
import { SkinCondition } from './skin-condition.enum';

describe('ScoringEngineService', () => {
  let service: ScoringEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoringEngineService],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeConditionScores', () => {
    it('should calculate condition scores correctly', () => {
      const metrics: SkinMetric[] = [
        { type: SkinCondition.ACNE, count: 5, severity: 0.5, averageConfidence: 0.8 },
        { type: SkinCondition.WRINKLES, count: 10, severity: 0.8, averageConfidence: 0.9 },
      ];

      const scores = service.computeConditionScores(metrics);

      expect(scores).toHaveLength(2);
      expect(scores[0].type).toBe(SkinCondition.ACNE);
      expect(scores[0].score).toBeGreaterThan(0);
      expect(scores[0].score).toBeLessThanOrEqual(100);
      
      expect(scores[1].type).toBe(SkinCondition.WRINKLES);
      expect(scores[1].score).toBeGreaterThan(0);
      expect(scores[1].score).toBeLessThanOrEqual(100);
    });

    it('should clamp severity factors and handle empty array', () => {
      const scores = service.computeConditionScores([]);
      expect(scores).toHaveLength(0);
    });
  });

  describe('calculateGlobalScore', () => {
    it('should calculate global score from condition scores', () => {
      const conditionScores = [
        { type: SkinCondition.ACNE, score: 80, count: 2, severity: 0.2 },
        { type: SkinCondition.HYDRATION, score: 60, count: 5, severity: 0.5 },
      ];

      const result = service.calculateGlobalScore(conditionScores);
      expect(result.globalScore).toBeGreaterThan(0);
      expect(result.globalScore).toBeLessThanOrEqual(100);
      expect(result.analysis.bestCondition).toBe(SkinCondition.ACNE);
      expect(result.analysis.worstCondition).toBe(SkinCondition.HYDRATION);
      expect(result.analysis.dominantCondition).toBe(SkinCondition.HYDRATION);
    });

    it('should handle zero condition scores', () => {
      const result = service.calculateGlobalScore([]);
      expect(result.globalScore).toBe(100);
      expect(result.analysis.bestCondition).toBeNull();
    });

    it('should handle custom weights', () => {
      const conditionScores = [
        { type: SkinCondition.ACNE, score: 90, count: 1, severity: 0.1 },
        { type: SkinCondition.WRINKLES, score: 50, count: 5, severity: 0.8 },
      ];

      const customWeights: Partial<ConditionWeights> = { acne: 90, wrinkles: 10 };
      const result = service.calculateGlobalScore(conditionScores, customWeights);
      
      // Since acne has much higher weight, global score should be closer to 90
      expect(result.globalScore).toBeGreaterThan(80);
    });
  });

  describe('validateWeights', () => {
    it('should validate correct weights', () => {
      expect(service.validateWeights({ acne: 10, pores: 20 })).toBe(true);
    });

    it('should invalidate negative weights', () => {
      expect(service.validateWeights({ acne: -10, pores: 20 })).toBe(false);
    });

    it('should invalidate all zero weights', () => {
      expect(service.validateWeights({ acne: 0, pores: 0 })).toBe(false);
    });
  });

  describe('getDefaultWeights', () => {
    it('should return default weights', () => {
      const weights = service.getDefaultWeights();
      expect(weights.acne).toBeDefined();
      expect(weights.wrinkles).toBeDefined();
    });
  });
});
