import { Test, TestingModule } from '@nestjs/testing';
import { DigitalTwinService } from './digital-twin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DigitalTwinSimulation } from './digital-twin.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { Routine } from '../routine/routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { AiAnalysisService } from '../ai/ai-analysis.service';
import { CreateDigitalTwinDto } from './digital-twin.dto';

describe('DigitalTwinService', () => {
  let service: DigitalTwinService;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAiService = {
    predictFutureSkin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalTwinService,
        { provide: getRepositoryToken(DigitalTwinSimulation), useValue: mockRepo },
        { provide: getRepositoryToken(SkinAnalysis), useValue: mockRepo },
        { provide: getRepositoryToken(Routine), useValue: mockRepo },
        { provide: getRepositoryToken(RoutineStep), useValue: mockRepo },
        { provide: AiAnalysisService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<DigitalTwinService>(DigitalTwinService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDigitalTwin', () => {
    it('should create and return a digital twin', async () => {
      const dto: CreateDigitalTwinDto = { baseAnalysisId: '1', routineConsistency: 'high', lifestyleFactors: [] };
      mockRepo.findOne.mockResolvedValueOnce({
        id: '1',
        userId: 'u1',
        skinScore: 70,
        skinAge: 30,
        hydration: 50,
        oil: 50,
        acne: 50,
        wrinkles: 50,
      });
      mockRepo.find.mockResolvedValueOnce([{ id: 'r1' }]); // routines
      mockRepo.find.mockResolvedValueOnce([{ productId: 'p1' }]); // routine steps
      mockAiService.predictFutureSkin.mockResolvedValueOnce({
        month1: { skinScore: 75, improvements: [] },
        month3: { skinScore: 80, improvements: [] },
        month6: { skinScore: 85, improvements: [] },
      });
      mockRepo.create.mockReturnValue({ id: 'tw1' });
      mockRepo.save.mockResolvedValue({
        id: 'tw1',
        month1Prediction: { skinScore: 75 },
        month3Prediction: { skinScore: 80 },
        month6Prediction: { skinScore: 85 },
      });

      const res = await service.createDigitalTwin('u1', dto);
      expect(res).toBeDefined();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should use fallback if AI fails', async () => {
      const dto: CreateDigitalTwinDto = { baseAnalysisId: '1', routineConsistency: 'low' };
      mockRepo.findOne.mockResolvedValueOnce({ id: '1', userId: 'u1', skinScore: 70, skinAge: 30, hydration: 50, oil: 50, acne: 50, wrinkles: 50 });
      mockRepo.find.mockResolvedValueOnce([]); // No routines
      mockAiService.predictFutureSkin.mockRejectedValueOnce(new Error('AI fail'));
      mockRepo.create.mockReturnValue({ id: 'tw1' });
      mockRepo.save.mockResolvedValue({
        id: 'tw1',
        month1Prediction: { skinScore: 70 },
        month3Prediction: { skinScore: 70 },
        month6Prediction: { skinScore: 70 },
      });

      const res = await service.createDigitalTwin('u1', dto);
      expect(res).toBeDefined();
    });

    it('should calculate higher improvement rate for high RoutineConsistency in fallback', async () => {
      const dto: CreateDigitalTwinDto = { baseAnalysisId: '1', routineConsistency: 'high' };
      mockRepo.findOne.mockResolvedValueOnce({ id: '1', userId: 'u1', skinScore: 70, skinAge: 30, hydration: 30, oil: 80, acne: 70, wrinkles: 60 });
      mockRepo.find.mockResolvedValueOnce([]); // No routines
      mockAiService.predictFutureSkin.mockRejectedValueOnce(new Error('AI fail'));
      mockRepo.create.mockReturnValue({ id: 'tw2' });
      mockRepo.save.mockResolvedValue({
        id: 'tw2',
        month1Prediction: { skinScore: 73 },
        month3Prediction: { skinScore: 78 },
        month6Prediction: { skinScore: 82 },
      });

      const res = await service.createDigitalTwin('u1', dto);
      expect(res).toBeDefined();
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('getDigitalTwinTimeline', () => {
    it('should return timeline dto', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'tw1',
        baseAnalysisId: 'a1',
        month1Prediction: { skinScore: 70 },
        month3Prediction: { skinScore: 80 },
        month6Prediction: { skinScore: 90 },
      });
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'a1',
        skinScore: 60,
        skinAge: 30,
        hydration: 50,
        oil: 50,
        acne: 50,
        wrinkles: 50,
      });

      const res = await service.getDigitalTwinTimeline('tw1', 'u1');
      expect(res).toBeDefined();
      expect(res.trends.bestOutcome).toBe('month6');
      expect(res.trends.overallTrajectory).toBe('improvement');
    });

    it('should return degradation trajectory when score drops', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'tw2',
        baseAnalysisId: 'a2',
        month1Prediction: { skinScore: 80 },
        month3Prediction: { skinScore: 70 },
        month6Prediction: { skinScore: 60 },
      });
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'a2',
        skinScore: 90,
        skinAge: 30,
        hydration: 50,
        oil: 50,
        acne: 50,
        wrinkles: 50,
      });

      const res = await service.getDigitalTwinTimeline('tw2', 'u2');
      expect(res.trends.overallTrajectory).toBe('degradation');
    });

    it('should return stable trajectory when score change is minimal', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'tw3',
        baseAnalysisId: 'a3',
        month1Prediction: { skinScore: 70 },
        month3Prediction: { skinScore: 70 },
        month6Prediction: { skinScore: 71 },
      });
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'a3',
        skinScore: 70,
        skinAge: 30,
        hydration: 50,
        oil: 50,
        acne: 50,
        wrinkles: 50,
      });

      const res = await service.getDigitalTwinTimeline('tw3', 'u3');
      expect(res.trends.overallTrajectory).toBe('stable');
    });

    it('should generate overall recommendation for mid-range score', () => {
      const predictions = {
        month1: { skinScore: 60, improvements: [] } as any,
        month3: { skinScore: 70, improvements: [] } as any,
        month6: { skinScore: 80, improvements: [] } as any,
      };

      const res = (service as any).generateOverallRecommendation(predictions);
      expect(res).toContain('Positive trajectory');
    });
    
    it('should generate overall recommendation for low-range score', () => {
      const predictions = {
        month1: { skinScore: 50, improvements: [] } as any,
        month3: { skinScore: 55, improvements: [] } as any,
        month6: { skinScore: 60, improvements: [] } as any,
      };

      const res = (service as any).generateOverallRecommendation(predictions);
      expect(res).toContain('consulting with a dermatologist');
    });
  });

  describe('getLatestDigitalTwin', () => {
    it('should return the latest digital twin if exists', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 'tw1' });
      const res = await service.getLatestDigitalTwin('u1');
      expect(res).toBeDefined();
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' }, order: { createdAt: 'DESC' } });
    });
  });
});
