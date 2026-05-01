import { Test, TestingModule } from '@nestjs/testing';
import { OpenRouterService } from './openrouter.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserSkinProfile } from './detection.interface';

// Mock d'Axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenRouterService', () => {
  let service: OpenRouterService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENROUTER_API_KEY') return 'test-api-key';
      return null;
    }),
  };

  const mockProfile: UserSkinProfile = {
    age: 25,
    gender: 'Female',
    skinType: 'Oily',
    concerns: ['Acne'],
    imageBase64: 'base64-fake-image',
    imagesBase64: ['base64-fake-image'],
    acneLevel: 80,
    blackheadsLevel: 50,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenRouterService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OpenRouterService>(OpenRouterService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeSkin', () => {
    it('should throw error if API key is missing', async () => {
      mockConfigService.get.mockReturnValueOnce(null);
      
      // On instancie un nouveau service avec la config sans clé
      const serviceWithoutKey = new OpenRouterService(mockConfigService as any);

      await expect(serviceWithoutKey.analyzeSkin(mockProfile)).rejects.toThrow('AI analysis unavailable - Missing API Key');
    });

    it('should successfully parse a valid JSON response from OpenRouter', async () => {
      const fakeApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: `Here is the analysis:
                {
                  "globalScore": 75,
                  "conditionScores": [],
                  "totalDetections": 2,
                  "analysis": {
                    "bestCondition": "Hydration",
                    "worstCondition": "Acne",
                    "dominantCondition": "Acne",
                    "expertInsights": null
                  }
                }`
              }
            }
          ]
        },
        status: 200,
      };

      mockedAxios.post.mockResolvedValueOnce(fakeApiResponse);

      const result = await service.analyzeSkin(mockProfile);

      expect(result.globalScore).toBe(75);
      expect(result.analysis.worstCondition).toBe('Acne');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should throw NOT_A_FACE error if AI detects no face', async () => {
      const fakeApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: '{"error": "NOT_A_FACE", "message": "No face found"}'
              }
            }
          ]
        },
        status: 200,
      };

      mockedAxios.post.mockResolvedValueOnce(fakeApiResponse);

      await expect(service.analyzeSkin(mockProfile)).rejects.toThrow('NOT_A_FACE');
    });

    it('should handle API rate limit (429) error gracefully', async () => {
      const axiosError = {
        response: { status: 429, data: { error: { message: 'Rate limit exceeded' } } },
        message: 'Request failed with status code 429'
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      await expect(service.analyzeSkin(mockProfile)).rejects.toThrow('OpenRouter rate limit exceeded');
    });

    it('should handle API insufficient credits (402) error', async () => {
      const axiosError = {
        response: { status: 402, data: { error: { message: 'Insufficient credits' } } },
        message: 'Request failed with status code 402'
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      await expect(service.analyzeSkin(mockProfile)).rejects.toThrow('OpenRouter API error (402): Insufficient credits');
    });
  });

  describe('analyzeSessionRisk', () => {
    it('should return default analysis if API key is missing', async () => {
      const serviceWithoutKey = new OpenRouterService({ get: () => null } as any);
      const result = await serviceWithoutKey.analyzeSessionRisk({});
      expect(result.score).toBe(20);
    });

    it('should return parsed risk analysis on success', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: '{"score": 85, "warning": "Suspicious login", "anomalies": ["IP"], "recommendation": "notify"}' } }]
        }
      });

      const result = await service.analyzeSessionRisk({});
      expect(result.score).toBe(85);
      expect(result.warning).toBe('Suspicious login');
    });

    it('should return default analysis on API error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      const result = await service.analyzeSessionRisk({});
      expect(result.score).toBe(20);
    });
  });

  describe('generateSVRRoutine', () => {
    const mockProducts = [
      { name: 'SVR Sebiaclear', category: 'cleanser', ingredients: ['Niacinamide'], suitableSkinTypes: ['Oily'], suitableConcerns: ['Acne'] }
    ];

    it('should throw error if API key is missing', async () => {
      const serviceWithoutKey = new OpenRouterService({ get: () => null } as any);
      await expect(serviceWithoutKey.generateSVRRoutine(mockProducts, mockProfile)).rejects.toThrow('AI analysis unavailable');
    });

    it('should successfully parse SVR routine JSON and enrich with image URL', async () => {
      const fakeApiResponse = {
        data: {
          choices: [{
            message: {
              content: `{
                "skinProfile": "Oily skin with acne",
                "generalAdvice": "Use salicylic acid",
                "recommendedProducts": [
                  { "name": "SVR Sebiaclear", "category": "cleanser" }
                ],
                "morning": [
                  { "stepName": "Cleanser", "product": { "name": "SVR Sebiaclear" } }
                ],
                "night": []
              }`
            }
          }]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(fakeApiResponse);

      // Add imageUrl to our mock catalog to test enrichment
      const catalog = [{ ...mockProducts[0], imageUrl: 'https://fake-image.jpg' }];

      const result = await service.generateSVRRoutine(catalog, mockProfile);

      expect(result.recommendedProducts[0].name).toBe('SVR Sebiaclear');
      // Verify enrichment
      expect(result.recommendedProducts[0].imageUrl).toBe('https://fake-image.jpg');
      expect(result.morning[0].product.imageUrl).toBe('https://fake-image.jpg');
    });
    
    it('should handle LLM failure (invalid JSON)', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Sorry, I cannot do that.' } }] }
      });

      await expect(service.generateSVRRoutine(mockProducts, mockProfile)).rejects.toThrow('Failed to parse SVR routine JSON');
    });
  });

  describe('chat', () => {
    it('should return error message if API key missing', async () => {
      const serviceWithoutKey = new OpenRouterService({ get: () => null } as any);
      const result = await serviceWithoutKey.chat('Hello');
      expect(result).toContain('indisponible');
    });

    it('should return chatbot answer', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Hello! How can I help?' } }] }
      });

      const result = await service.chat('Hi', 'You are a bot', 'FREE');
      expect(result).toBe('Hello! How can I help?');
    });
  });
});
