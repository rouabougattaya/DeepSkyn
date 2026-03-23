import { apiGet } from './apiClient';
import type { DashboardMetrics, MonthlyData, TrendData } from '../types/dashboard';

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    return apiGet<DashboardMetrics>('/dashboard/metrics');
  },

  async getTrends(): Promise<TrendData[]> {
    return apiGet<TrendData[]>('/dashboard/trends');
  },

  async getMonthlyData(months: number = 12): Promise<MonthlyData[]> {
    return apiGet<MonthlyData[]>(`/dashboard/monthly?months=${months}`);
  },
};
