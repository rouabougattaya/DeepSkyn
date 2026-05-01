import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';

// Mock du module Google Generative AI
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  return {
    GoogleGenerativeAI: jest.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    __mockGenerateContent: mockGenerateContent, // Expose pour pouvoir modifier les retours
  };
});

describe('GeminiService', () => {
  let service: GeminiService;
  let mockGenerateContent: jest.Mock;

  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Récupère le mock exposé
    const genAI = require('@google/generative-ai');
    mockGenerateContent = genAI.__mockGenerateContent;
    mockGenerateContent.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiService],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    
    // Mock the Date.now() function to avoid rate limiting issues in tests
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize model when GEMINI_API_KEY is present', () => {
      process.env.GEMINI_API_KEY = 'fake-api-key';
      
      service.onModuleInit();
      
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      expect(GoogleGenerativeAI).toHaveBeenCalledWith('fake-api-key');
      // The model should be initialized internally
      expect(service['model']).toBeDefined();
    });

    it('should not initialize model when GEMINI_API_KEY is missing', () => {
      delete process.env.GEMINI_API_KEY;
      
      service.onModuleInit();
      
      expect(service['model']).toBeNull();
    });
  });

  describe('analyzeSessionRisk', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'fake-api-key';
      service.onModuleInit();
      
      // Override time to pass rate limit
      jest.spyOn(Date, 'now').mockReturnValue(100000); 
    });

    it('should return default analysis if model is not initialized', async () => {
      service['model'] = null; // Force null model
      const result = await service.analyzeSessionRisk({});
      expect(result).toEqual({
        score: 20,
        warning: null,
        anomalies: [],
        recommendation: 'keep',
      });
    });

    it('should return default analysis on rate limit', async () => {
      // First call (time = 100000)
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score":50,"recommendation":"keep"}' }
      });
      await service.analyzeSessionRisk({});
      
      // Second call immediately after (time = 100000 < 100000 + 60000)
      const result = await service.analyzeSessionRisk({});
      
      expect(result).toEqual({
        score: 20,
        warning: null,
        anomalies: [],
        recommendation: 'keep',
      });
      // Ensure the model was only called once
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should parse valid JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Here is the analysis: {"score": 80, "warning": "Suspicious IP", "anomalies": ["IP"], "recommendation": "notify"}' }
      });

      const sessionData = { fingerprint: { browser: 'Chrome', isMobile: false } };
      const result = await service.analyzeSessionRisk(sessionData);

      expect(result).toEqual({
        score: 80,
        warning: 'Suspicious IP',
        anomalies: ['IP'],
        recommendation: 'notify',
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should return default analysis on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API failure'));

      const result = await service.analyzeSessionRisk({});

      expect(result).toEqual({
        score: 20,
        warning: null,
        anomalies: [],
        recommendation: 'keep',
      });
    });

    it('should handle quota exceeded error (status 429)', async () => {
      const error: any = new Error('Quota exceeded');
      error.status = 429;
      mockGenerateContent.mockRejectedValue(error);

      const result = await service.analyzeSessionRisk({});

      expect(result).toEqual({
        score: 30,
        warning: 'Analyse temporairement indisponible (limite API atteinte)',
        anomalies: [],
        recommendation: 'keep',
      });
    });
  });

  describe('generateContent', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'fake-api-key';
      service.onModuleInit();
    });

    it('should return null if model is not initialized', async () => {
      service['model'] = null;
      const result = await service.generateContent('test prompt');
      expect(result).toBeNull();
    });

    it('should return text response on success', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Generative response text' }
      });

      const result = await service.generateContent('test prompt');
      expect(result).toBe('Generative response text');
    });

    it('should return null on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API failure'));

      const result = await service.generateContent('test prompt');
      expect(result).toBeNull();
    });
  });

  describe('classifyActivityRisk', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'fake-api-key';
      service.onModuleInit();
    });

    it('should return null if model is not initialized', async () => {
      service['model'] = null;
      const result = await service.classifyActivityRisk({});
      expect(result).toBeNull();
    });

    it('should parse valid JSON risk classification', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"riskLevel": "high", "explanation": "Login from new country", "recommendedAction": "notify"}' }
      });

      const result = await service.classifyActivityRisk({ type: 'login' });
      expect(result).toEqual({
        riskLevel: 'high',
        explanation: 'Login from new country',
        recommendedAction: 'notify',
      });
    });

    it('should return null if response is not JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'I cannot process this request.' }
      });

      const result = await service.classifyActivityRisk({ type: 'login' });
      expect(result).toBeNull();
    });
  });

  describe('generateSmartNotification', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'fake-api-key';
      service.onModuleInit();
    });

    it('should parse valid JSON notification', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"title": "Hydration Time", "message": "Your skin needs water", "priority": "high"}' }
      });

      const result = await service.generateSmartNotification({
        routine: 'morning',
        skinCondition: 'dry',
        weather: { temp: 30 },
        timeOfDay: 'morning',
      });

      expect(result).toEqual({
        title: 'Hydration Time',
        message: 'Your skin needs water',
        priority: 'high',
      });
    });

    it('should return fallback notification if parsing fails', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Invalid JSON response' }
      });

      const result = await service.generateSmartNotification({
        routine: 'morning',
        skinCondition: 'dry',
        weather: { temp: 30 },
        timeOfDay: 'morning',
      });

      expect(result).toEqual({
        title: 'Skincare Reminder',
        message: 'Time for your skincare routine!',
        priority: 'medium',
      });
    });
  });
});
