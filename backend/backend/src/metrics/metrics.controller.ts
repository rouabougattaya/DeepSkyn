import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MetricsService, DashboardMetrics, MonthlyData, TrendData } from './metrics.service';

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
}
