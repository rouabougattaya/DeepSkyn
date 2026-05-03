import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiAnalysisService } from './aiAnalysisService';
import * as apiClient from './apiClient';

vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('aiAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('analyzeImage should call apiPost and return data', async () => {
    const mockResult = { score: 85 };
    (apiClient.apiPost as any).mockResolvedValue({ success: true, data: mockResult });

    const result = await aiAnalysisService.analyzeImage('img-1', { hydration: 1 }, 'mixed', 25);
    expect(result).toEqual(mockResult);
    expect(apiClient.apiPost).toHaveBeenCalledWith('/ai/analyze', {
      imageId: 'img-1',
      weights: { hydration: 1 },
      testType: 'mixed',
      age: 25,
    });
  });

  it('analyzeRandom should build query string correctly', async () => {
    const mockResult = { score: 90 };
    (apiClient.apiGet as any).mockResolvedValue({ success: true, data: mockResult, seed: 123 });

    const result = await aiAnalysisService.analyzeRandom(123, { acne: 1 }, 30);
    expect(result).toEqual({ result: mockResult, seed: 123 });
    const query = 'seed=123&weights=%7B%22acne%22%3A1%7D&age=30';
    expect(apiClient.apiGet).toHaveBeenCalledWith(`/ai/analyze/random?${query}`);
  });

  it('analyzeTestCase should build query string correctly', async () => {
    const mockResult = { score: 70 };
    (apiClient.apiGet as any).mockResolvedValue({ success: true, data: mockResult });

    const result = await aiAnalysisService.analyzeTestCase('severe', { wrinkles: 1 }, 50);
    expect(result).toEqual(mockResult);
    const query = 'weights=%7B%22wrinkles%22%3A1%7D&age=50';
    expect(apiClient.apiGet).toHaveBeenCalledWith(`/ai/analyze/test/severe?${query}`);
  });

  it('getDefaultWeights should return data', async () => {
    const mockWeights = { hydration: 1 };
    (apiClient.apiGet as any).mockResolvedValue({ success: true, data: mockWeights });

    const result = await aiAnalysisService.getDefaultWeights();
    expect(result).toEqual(mockWeights);
    expect(apiClient.apiGet).toHaveBeenCalledWith('/ai/weights/default');
  });

  it('validateWeights should call apiPost', async () => {
    const mockValidation = { isValid: true, weights: {} };
    (apiClient.apiPost as any).mockResolvedValue({ success: true, data: mockValidation });

    const result = await aiAnalysisService.validateWeights({ hydration: 1 });
    expect(result).toEqual(mockValidation);
    expect(apiClient.apiPost).toHaveBeenCalledWith('/ai/weights/validate', { hydration: 1 });
  });

  it('analyzeUnified should call apiPost', async () => {
    const mockResult = { score: 80 };
    const mockProfile = { name: 'Test', age: 25 };
    (apiClient.apiPost as any).mockResolvedValue({ success: true, data: mockResult });

    const result = await aiAnalysisService.analyzeUnified(mockProfile as any);
    expect(result).toEqual(mockResult);
    expect(apiClient.apiPost).toHaveBeenCalledWith('/ai/analyze/unified', mockProfile);
  });
});
