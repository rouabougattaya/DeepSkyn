import { Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MetricsService, DashboardMetrics, MonthlyData, TrendData } from './metrics.service';

/**
 * ════════════════════════════════════════════════════════════════
 *  Metrics Aggregation Controller — Dev 1 (Roua)
 * ════════════════════════════════════════════════════════════════
 *
 *  Endpoints:
 *  ├── GET  /dashboard/metrics   → KPI data (avg, best, worst, σ, median, Q1/Q3)
 *  ├── GET  /dashboard/trends    → Multi-period trend comparison
 *  ├── GET  /dashboard/monthly   → Monthly aggregation for Chart.js
 *  └── POST /dashboard/seed      → Seed demo data (6 months)
 */
@Public()
@Controller('dashboard')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) { }

  @Get('metrics')
  async getMetrics(): Promise<DashboardMetrics> {
    return this.metricsService.getDashboardMetrics();
  }

  @Get('trends')
  async getTrends(): Promise<TrendData[]> {
    return this.metricsService.getTrends();
  }

  @Get('monthly')
  async getMonthlyData(@Query('months') months?: string): Promise<MonthlyData[]> {
    const monthCount = months ? parseInt(months, 10) : 12;
    return this.metricsService.getMonthlyData(monthCount);
  }

  @Get('ping')
  async ping(): Promise<string> {
    return 'pong';
  }

  /**
   * Seed demo data — Creates 6 months of realistic SkinAnalysis records.
   * Only works if the database is empty (no existing analyses).
   */
  @Post('seed')
  async seedData(): Promise<{ created: number; months: number }> {
    return this.metricsService.seedDemoData();
  }
}
