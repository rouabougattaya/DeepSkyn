import { describe, it, expect, vi, beforeEach } from 'vitest';
import { comparisonService } from './comparison.service';
import { apiGet } from './apiClient';

vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ComparisonService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUserAnalyses should call apiGet with pagination', async () => {
    (apiGet as any).mockResolvedValue({ data: [], total: 0 });
    
    const result = await comparisonService.getUserAnalyses(1, 10);
    
    expect(apiGet).toHaveBeenCalledWith('/analysis/user?page=1&limit=10');
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('compare should call apiGet with comparison query params', async () => {
    const mockResult = {
      first: { id: '1' },
      second: { id: '2' },
      differences: [{ metric: 'hydration', delta: 5, trend: 'improvement' }],
      globalTrend: 'improvement',
      summaryText: 'Skin is improving'
    };

    (apiGet as any).mockResolvedValue(mockResult);

    const result = await comparisonService.compare('1', '2');

    expect(apiGet).toHaveBeenCalledWith('/analysis/compare?firstId=1&secondId=2');
    expect(result).toEqual(mockResult);
  });

  it('getAnalysis should call apiGet with analysis ID', async () => {
    (apiGet as any).mockResolvedValue({ id: '1' });
    
    const result = await comparisonService.getAnalysis('1');
    
    expect(apiGet).toHaveBeenCalledWith('/analysis/1');
    expect(result).toEqual({ id: '1' });
  });

  it('compare should handle server errors', async () => {
    (apiGet as any).mockRejectedValue(new Error('Server Error'));

    await expect(comparisonService.compare('1', '2')).rejects.toThrow('Server Error');
  });
});
