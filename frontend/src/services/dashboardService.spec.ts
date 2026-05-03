import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardService } from './dashboardService';
import * as apiClient from './apiClient';

vi.mock('./apiClient', () => ({
  apiGet: vi.fn(),
}));

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMetrics should call apiGet with /dashboard/metrics', async () => {
    const mockMetrics = { totalUsers: 100 };
    (apiClient.apiGet as any).mockResolvedValue(mockMetrics);

    const result = await dashboardService.getMetrics();
    expect(result).toEqual(mockMetrics);
    expect(apiClient.apiGet).toHaveBeenCalledWith('/dashboard/metrics');
  });

  it('getTrends should call apiGet with /dashboard/trends', async () => {
    const mockTrends = [{ date: '2023-01-01', value: 10 }];
    (apiClient.apiGet as any).mockResolvedValue(mockTrends);

    const result = await dashboardService.getTrends();
    expect(result).toEqual(mockTrends);
    expect(apiClient.apiGet).toHaveBeenCalledWith('/dashboard/trends');
  });

  it('getMonthlyData should call apiGet with correct query param', async () => {
    const mockData = [{ month: 'Jan', value: 100 }];
    (apiClient.apiGet as any).mockResolvedValue(mockData);

    const result = await dashboardService.getMonthlyData(6);
    expect(result).toEqual(mockData);
    expect(apiClient.apiGet).toHaveBeenCalledWith('/dashboard/monthly?months=6');
  });

  it('getMonthlyData should use default value for months', async () => {
    (apiClient.apiGet as any).mockResolvedValue([]);
    await dashboardService.getMonthlyData();
    expect(apiClient.apiGet).toHaveBeenCalledWith('/dashboard/monthly?months=12');
  });
});
