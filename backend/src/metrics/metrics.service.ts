import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { SkinMetric } from '../skinMetric/skin-metric.entity';
import * as crypto from 'crypto';

/* ════════════════════════════════════════════════════════════════════════
 *  INTERFACES — Metrics Aggregation Engine (Dev 1 — Roua)
 *
 *  This service acts as THE STATISTICIAN of the application.
 *  It reads persisted analysis data created by the AI module,
 *  then applies statistical computations using pure JavaScript
 *  (no SQL aggregation: uses reduce, Map, Math).
 * ════════════════════════════════════════════════════════════════════════ */

export interface DashboardMetrics {
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalAnalyses: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage: number;
  standardDeviation: number;
  medianScore: number;
  percentile25: number;
  percentile75: number;
  movingAverage5: number;
  latestAnalysisId?: string;
}

export interface MonthlyData {
  month: string;
  averageScore: number;
  analysisCount: number;
  bestScore: number;
  worstScore: number;
  standardDeviation: number;
  changePercent?: number;
}

export interface TrendData {
  period: string;
  current: number;
  previous: number;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  label: string;
  sampleSize: number;
}

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(SkinAnalysis)
    private readonly analysisRepo: Repository<SkinAnalysis>,
    @InjectRepository(SkinMetric)
    private readonly metricRepo: Repository<SkinMetric>,
  ) { }

  async getDashboardMetrics(userId?: string): Promise<DashboardMetrics> {
    const queryWork: any = { order: { createdAt: 'DESC' }, where: { status: 'COMPLETED' } };
    if (userId) queryWork.where = { ...queryWork.where, userId };
    
    const analyses = await this.analysisRepo.find(queryWork);
    if (analyses.length === 0) {
      return {
        averageScore: 0, bestScore: 0, worstScore: 0, totalAnalyses: 0,
        trendDirection: 'stable', trendPercentage: 0, standardDeviation: 0,
        medianScore: 0, percentile25: 0, percentile75: 0, movingAverage5: 0,
        latestAnalysisId: undefined,
      };
    }

    const scores = analyses.map(a => a.skinScore || 0);
    const lastScore = scores[0];
    const prevScore = scores[1] || lastScore;
    const trendPct = this.changePercent(prevScore, lastScore);

    return {
      averageScore: this.round(this.mean(scores)),
      bestScore: this.round(Math.max(...scores)),
      worstScore: this.round(Math.min(...scores)),
      totalAnalyses: analyses.length,
      trendDirection: this.direction(prevScore, lastScore),
      trendPercentage: this.round(Math.abs(trendPct)),
      standardDeviation: this.round(this.stdDev(scores)),
      medianScore: this.round(this.median(scores)),
      percentile25: this.round(this.percentile(scores, 25)),
      percentile75: this.round(this.percentile(scores, 75)),
      movingAverage5: this.round(this.mean(scores.slice(0, 5))),
      latestAnalysisId: analyses[0]?.id,
    };
  }

  async getTrends(userId?: string): Promise<TrendData[]> {
    const queryWork: any = { order: { createdAt: 'DESC' }, where: { status: 'COMPLETED' } };
    if (userId) queryWork.where = { ...queryWork.where, userId };
    
    const allAnalyses = await this.analysisRepo.find(queryWork);
    if (allAnalyses.length < 2) return [];

    return [
      this.buildPeriodTrend(allAnalyses, 7, 'Semaine dernière'),
      this.buildPeriodTrend(allAnalyses, 30, 'Mois dernier'),
      this.buildPeriodTrend(allAnalyses, 90, 'Trimestre dernier'),
    ];
  }

  async getMonthlyData(months: number = 12, userId?: string): Promise<MonthlyData[]> {
    const queryWork: any = { order: { createdAt: 'ASC' }, where: { status: 'COMPLETED' } };
    if (userId) queryWork.where = { ...queryWork.where, userId };

    const all = await this.analysisRepo.find(queryWork);
    const monthlyMap = new Map<string, number[]>();

    all.forEach(a => {
      const monthKey = a.createdAt.toISOString().slice(0, 7);
      const list = monthlyMap.get(monthKey) || [];
      list.push(a.skinScore || 0);
      monthlyMap.set(monthKey, list);
    });

    const results: MonthlyData[] = [];
    const keys = Array.from(monthlyMap.keys()).sort();

    keys.forEach((key, index) => {
      const vals = monthlyMap.get(key)!;
      const avg = this.mean(vals);
      const prevAvg = index > 0 ? this.mean(monthlyMap.get(keys[index - 1])!) : undefined;

      results.push({
        month: key,
        averageScore: this.round(avg),
        analysisCount: vals.length,
        bestScore: this.round(Math.max(...vals)),
        worstScore: this.round(Math.min(...vals)),
        standardDeviation: this.round(this.stdDev(vals)),
        changePercent: prevAvg !== undefined ? this.round(this.changePercent(prevAvg, avg)) : undefined,
      });
    });

    return results.slice(-months);
  }

  private mean(arr: number[]): number {
    return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  private stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const avg = this.mean(arr);
    const variance = arr.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * (p / 100);
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }

  private changePercent(oldV: number, newV: number): number {
    return oldV === 0 ? 0 : ((newV - oldV) / oldV) * 100;
  }

  private direction(oldV: number, newV: number): 'up' | 'down' | 'stable' {
    const diff = newV - oldV;
    const pct = this.changePercent(oldV, newV);
    if (Math.abs(pct) < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  private round(v: number): number {
    return Math.round(v * 10) / 10;
  }

  private buildPeriodTrend(analyses: SkinAnalysis[], days: number, label: string): TrendData {
    const now = new Date();
    const midPoint = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startPoint = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const currPeriod = analyses.filter(a => a.createdAt >= midPoint);
    const prevPeriod = analyses.filter(a => a.createdAt >= startPoint && a.createdAt < midPoint);

    const currAvg = this.mean(currPeriod.map(a => a.skinScore || 0));
    const prevAvg = this.mean(prevPeriod.map(a => a.skinScore || 0));

    return {
      period: `${days}d`,
      current: this.round(currAvg),
      previous: this.round(prevAvg),
      direction: this.direction(prevAvg, currAvg),
      percentage: this.round(Math.abs(this.changePercent(prevAvg, currAvg))),
      label,
      sampleSize: currPeriod.length,
    };
  }

  async seedDemoData(userId: string = 'demo-user'): Promise<any> {
    try {
      await this.analysisRepo.delete({ userId: userId }); // Nettoyer pour cet utilisateur
      // Ou si on veut tout supprimer peu importe l'user:
      // await this.analysisRepo.createQueryBuilder().delete().from(SkinAnalysis).execute();
      const now = new Date();
      const records: any[] = [];
      for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
        const analysesCount = 3 + crypto.randomInt(0, 3);
        for (let j = 0; j < analysesCount; j++) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - monthsAgo);
          date.setDate(1 + crypto.randomInt(0, 26));
          const baseScore = 50 + (5 - monthsAgo) * 7;
          const variation = (crypto.randomInt(0, 100) / 100 - 0.5) * 15;
          const score = Math.max(20, Math.min(96, baseScore + variation));
          records.push({
            userId,
            status: 'COMPLETED',
            skinScore: Math.round(score * 10) / 10,
            summary: `Seed analysis - T${monthsAgo}`,
            aiRawResponse: { source: 'seed' },
            createdAt: date,
          });
        }
      }
      records.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());
      for (const record of records) {
        await this.analysisRepo.insert(record);
      }
      return { success: true, created: records.length, message: '6 months of data seeded successfully' };
    } catch (error) {
      console.error('SEED ERROR:', error);
      return { error: error.message };
    }
  }
}
