import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { ImageValidationService } from './image-validation.service';
import { RiskPredictionService } from './risk-prediction.service';
import { SvrRoutineService } from './svr-routine.service';
import { SkinCondition } from './skin-condition.enum';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@xenova/transformers', () => {
  return {
    pipeline: jest.fn(),
    env: { allowLocalModels: true },
    RawImage: {
      fromBlob: jest.fn(),
    },
  };
});

describe('AiController', () => {
  let controller: AiController;
  let mockAiAnalysisService: jest.Mocked<Partial<AiAnalysisService>>;
  let mockImageValidationService: jest.Mocked<Partial<ImageValidationService>>;

  beforeEach(async () => {
    mockAiAnalysisService = {
      analyzeSkinWithLLM: jest.fn(),
      analyzeImage: jest.fn(),
      analyzeWithRandomDetections: jest.fn(),
      debugAnalysis: jest.fn(),
    };

    mockImageValidationService = {
      validateImageBeforeAnalysis: jest.fn(),
    };

    const mockRiskPredictionService = {
      predictSkinRisks: jest.fn(),
    };

    const mockSvrRoutineService = {
      generateRoutine: jest.fn(),
      getDebugProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiAnalysisService, useValue: mockAiAnalysisService },
        { provide: ImageValidationService, useValue: mockImageValidationService },
        { provide: RiskPredictionService, useValue: mockRiskPredictionService },
        { provide: SvrRoutineService, useValue: mockSvrRoutineService },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyzeUnified', () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = {
      skinType: 'Oily' as const,
      age: 25,
      acneLevel: 80,
    };

    it('should successfully analyze without images', async () => {
      mockAiAnalysisService.analyzeSkinWithLLM!.mockResolvedValueOnce({
        globalScore: 85,
        conditionScores: [],
        totalDetections: 0,
        analysis: {
          dominantCondition: null,
          bestCondition: null,
          worstCondition: null,
        }
      });

      const result = await controller.analyzeUnified(mockProfile, mockUser);

      expect(result.success).toBe(true);
      expect(result.data.globalScore).toBe(85);
      expect(mockImageValidationService.validateImageBeforeAnalysis).not.toHaveBeenCalled();
      expect(mockAiAnalysisService.analyzeSkinWithLLM).toHaveBeenCalledWith(mockProfile, 'user-123');
    });

    it('should validate single image before analysis', async () => {
      const profileWithImage = { ...mockProfile, imageBase64: 'data:image/jpeg;base64,...' };
      mockImageValidationService.validateImageBeforeAnalysis!.mockResolvedValueOnce({ isValid: true, message: 'OK' });
      mockAiAnalysisService.analyzeSkinWithLLM!.mockResolvedValueOnce({ 
        globalScore: 90,
        conditionScores: [],
        totalDetections: 0,
        analysis: {
          dominantCondition: null,
          bestCondition: null,
          worstCondition: null,
        } 
      });

      const result = await controller.analyzeUnified(profileWithImage, mockUser);

      expect(result.success).toBe(true);
      expect(mockImageValidationService.validateImageBeforeAnalysis).toHaveBeenCalledWith('data:image/jpeg;base64,...');
    });

    it('should throw BAD_REQUEST if image validation fails', async () => {
      const profileWithImage = { ...mockProfile, imageBase64: 'data:image/jpeg;base64,...' };
      mockImageValidationService.validateImageBeforeAnalysis!.mockResolvedValueOnce({ isValid: false, message: 'Invalid face' });

      await expect(controller.analyzeUnified(profileWithImage, mockUser))
        .rejects.toThrow('Veuillez fournir une photo d\'un visage humain valide.');
    });

    it('should throw INTERNAL_SERVER_ERROR if AiAnalysisService fails', async () => {
      mockAiAnalysisService.analyzeSkinWithLLM!.mockRejectedValueOnce(new Error('LLM failed'));

      await expect(controller.analyzeUnified(mockProfile, mockUser))
        .rejects.toThrow(HttpException);
    });
  });

  describe('checkOpenRouterHealth', () => {
    it('should return success true if analysis succeeds', async () => {
      mockAiAnalysisService.analyzeSkinWithLLM!.mockResolvedValueOnce({
        globalScore: 85,
        totalDetections: 1,
        analysis: {
          dominantCondition: SkinCondition.ACNE,
          bestCondition: null,
          worstCondition: null,
        },
        conditionScores: [{ type: SkinCondition.ACNE, score: 90, count: 1, severity: 0.1, evaluated: true, notEvaluatedReason: null }]
      });

      const result = await controller.checkOpenRouterHealth();

      expect(result.success).toBe(true);
      expect(result.data.globalScore).toBe(85);
      expect(result.data.conditionCount).toBe(1);
    });

    it('should return success false if analysis fails', async () => {
      mockAiAnalysisService.analyzeSkinWithLLM!.mockRejectedValueOnce(new Error('API Down'));

      const result = await controller.checkOpenRouterHealth();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Down');
    });
  });

  describe('proxyImageSvr', () => {
    it('should allow SVR domains', async () => {
      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('image-data'),
        headers: { 'content-type': 'image/jpeg' }
      });

      await controller.proxyImageSvr('https://fr.svr.com/image.jpg', mockRes);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should block non-SVR domains', async () => {
      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.proxyImageSvr('https://malicious.com/image.jpg', mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to fetch SVR image' }));
    });
  });

  describe('analyzeRandom', () => {
    it('should handle invalid weights JSON', async () => {
      const mockUser = { id: 'user-1' };
      await expect(controller.analyzeRandom('123', 'invalid-json', '30', mockUser))
        .rejects.toThrow('Invalid weights JSON format');
    });
  });
});
