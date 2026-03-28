import { Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MetricsService, DashboardMetrics, MonthlyData, TrendData } from './metrics.service';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';

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
@UseGuards(JwtAccessGuard)
@Controller('dashboard')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) { }

  @Get('metrics')
  async getMetrics(@CurrentUser() user: User | { id: string }): Promise<DashboardMetrics> {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User ID required');
    return this.metricsService.getDashboardMetrics(userId);
  }

  @Get('trends')
  async getTrends(@CurrentUser() user: User | { id: string }): Promise<TrendData[]> {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User ID required');
    return this.metricsService.getTrends(userId);
  }

  @Get('monthly')
  async getMonthlyData(
    @CurrentUser() user: User | { id: string },
    @Query('months') months?: string
  ): Promise<MonthlyData[]> {
    const userId = user?.id;
    if (!userId) throw new UnauthorizedException('User ID required');
    const monthCount = months ? parseInt(months, 10) : 12;
    return this.metricsService.getMonthlyData(monthCount, userId);
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
