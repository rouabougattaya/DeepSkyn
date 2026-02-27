import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';

export interface DashboardMetrics {
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalAnalyses: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface MonthlyData {
  month: string;
  averageScore: number;
  analysisCount: number;
  bestScore: number;
  worstScore: number;
}

export interface TrendData {
  period: string;
  current: number;
  previous: number;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(SkinAnalysis)
    private readonly analysisRepo: Repository<SkinAnalysis>,
    @InjectRepository(SkinMetric)
    private readonly metricRepo: Repository<SkinMetric>,
  ) {}

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const analyses = await this.analysisRepo.find({
      order: { createdAt: 'DESC' },
      take: 100, // Derniers 100 analyses
    });

    if (analyses.length === 0) {
      return {
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        totalAnalyses: 0,
        trendDirection: 'stable',
        trendPercentage: 0,
      };
    }

    const scores = analyses.map(a => a.skinScore || 0);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    
    // Calcul de la tendance (comparaison première moitié vs seconde moitié)
    const midPoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midPoint);
    const secondHalf = scores.slice(midPoint);
    
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length : 0;
    
    const trendDirection = this.calculateTrendDirection(firstHalfAvg, secondHalfAvg);
    const trendPercentage = this.calculateTrendPercentage(firstHalfAvg, secondHalfAvg);

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      bestScore: Math.round(bestScore * 100) / 100,
      worstScore: Math.round(worstScore * 100) / 100,
      totalAnalyses: analyses.length,
      trendDirection,
      trendPercentage: Math.round(trendPercentage * 100) / 100,
    };
  }

  async getMonthlyData(months: number = 12): Promise<MonthlyData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const analyses = await this.analysisRepo
      .createQueryBuilder('analysis')
      .where('analysis.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('analysis.createdAt', 'ASC')
      .getMany();

    // Grouper par mois
    const monthlyGroups = new Map<string, SkinAnalysis[]>();
    
    analyses.forEach(analysis => {
      const monthKey = this.formatMonthKey(analysis.createdAt);
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(analysis);
    });

    // Générer les données mensuelles
    const monthlyData: MonthlyData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthKey = this.formatMonthKey(currentDate);
      const monthAnalyses = monthlyGroups.get(monthKey) || [];
      
      if (monthAnalyses.length > 0) {
        const scores = monthAnalyses.map(a => a.skinScore || 0);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const bestScore = Math.max(...scores);
        const worstScore = Math.min(...scores);
        
        monthlyData.push({
          month: monthKey,
          averageScore: Math.round(averageScore * 100) / 100,
          analysisCount: monthAnalyses.length,
          bestScore: Math.round(bestScore * 100) / 100,
          worstScore: Math.round(worstScore * 100) / 100,
        });
      } else {
        monthlyData.push({
          month: monthKey,
          averageScore: 0,
          analysisCount: 0,
          bestScore: 0,
          worstScore: 0,
        });
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return monthlyData;
  }

  async getTrends(): Promise<TrendData[]> {
    const analyses = await this.analysisRepo.find({
      order: { createdAt: 'ASC' },
    });

    if (analyses.length < 2) {
      return [];
    }

    const trends: TrendData[] = [];
    
    // Tendance sur 7 jours
    trends.push(this.calculatePeriodTrend(analyses, 7, '7 days'));
    
    // Tendance sur 30 jours
    trends.push(this.calculatePeriodTrend(analyses, 30, '30 days'));
    
    // Tendance sur 90 jours
    trends.push(this.calculatePeriodTrend(analyses, 90, '90 days'));

    return trends;
  }

  private calculateTrendDirection(previous: number, current: number): 'up' | 'down' | 'stable' {
    const threshold = 0.05; // 5% de tolérance
    const change = (current - previous) / previous;
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private calculateTrendPercentage(previous: number, current: number): number {
    if (previous === 0) return 0;
    return Math.abs(((current - previous) / previous) * 100);
  }

  private formatMonthKey(date: Date): string {
    return date.toISOString().slice(0, 7); // YYYY-MM
  }

  private calculatePeriodTrend(analyses: SkinAnalysis[], days: number, periodName: string): TrendData {
    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days * 2);
    const midPoint = new Date();
    midPoint.setDate(midPoint.getDate() - days);

    const previousPeriod = analyses.filter(a => 
      a.createdAt >= periodStart && a.createdAt < midPoint
    );
    const currentPeriod = analyses.filter(a => 
      a.createdAt >= midPoint && a.createdAt <= now
    );

    const previousAvg = this.calculateAverage(previousPeriod);
    const currentAvg = this.calculateAverage(currentPeriod);

    return {
      period: periodName,
      current: currentAvg,
      previous: previousAvg,
      direction: this.calculateTrendDirection(previousAvg, currentAvg),
      percentage: this.calculateTrendPercentage(previousAvg, currentAvg),
    };
  }

  private calculateAverage(analyses: SkinAnalysis[]): number {
    if (analyses.length === 0) return 0;
    const scores = analyses.map(a => a.skinScore || 0);
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
  }
}
