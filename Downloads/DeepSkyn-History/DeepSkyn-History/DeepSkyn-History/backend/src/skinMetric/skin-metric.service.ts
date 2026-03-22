import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinMetric } from './skin-metric.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { ScoringService, MetricType } from '../scoring.service';
import { WeightsDto } from '../weights.dto';
import type {
  CompareAnalysisResultDto,
  AnalysisMetricsView,
  MetricDifference,
  MetricKey,
} from '../compare-analysis.dto';

@Injectable()
export class SkinMetricService {
  private readonly logger = new Logger(SkinMetricService.name);

  constructor(
    @InjectRepository(SkinMetric)
    private readonly metricRepo: Repository<SkinMetric>,
    @InjectRepository(SkinAnalysis)
    private readonly analysisRepo: Repository<SkinAnalysis>,
    private readonly scoringService: ScoringService,
  ) { }

  async updateMetric(metricId: string, value: number, weights: WeightsDto) {
    const metric = await this.metricRepo.findOne({ where: { id: metricId } });
    if (!metric) throw new Error('Metric not found');
    metric.score = value;
    await this.metricRepo.save(metric);
    // Recalcul automatique du score global
    await this.recalculateAnalysisScore(metric.analysisId, weights);
    return metric;
  }

  async recalculateAnalysisScore(analysisId: string, weights: WeightsDto) {
    const analysis = await this.analysisRepo.findOne({ where: { id: analysisId } });
    if (!analysis) throw new Error('Analysis not found');
    const metrics = await this.metricRepo.find({ where: { analysisId } });
    const metricScores = metrics.map(m => ({ type: m.metricType as MetricType, value: m.score }));
    const score = this.scoringService.calculateGlobalScore(metricScores, weights);
    analysis.skinScore = score;
    await this.analysisRepo.save(analysis);
    return score;
  }

  /**
   * Retourne les analyses de l'utilisateur avec pagination, triées par date décroissante.
   */
  async getUserAnalyses(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: { id: string; createdAt: Date | string; skinScore: number }[]; total: number }> {
    if (!userId || typeof userId !== 'string') {
      this.logger.warn('getUserAnalyses called with missing or invalid userId');
      throw new UnauthorizedException('User ID is required');
    }

    const skip = (page - 1) * limit;

    const [list, total] = await this.analysisRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'createdAt', 'skinScore'],
      take: limit,
      skip: skip,
    });

    this.logger.debug(`getUserAnalyses — found ${list.length} analyses (total ${total}) for userId=${userId}`);

    return {
      data: list.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        skinScore: a.skinScore ?? 0,
      })),
      total,
    };
  }

  async getAnalysisById(id: string) {
    const analysis = await this.analysisRepo.findOne({ where: { id } });
    if (!analysis) throw new NotFoundException('Analysis not found');

    const metrics = await this.metricRepo.find({ where: { analysisId: id } });
    return {
      ...analysis,
      metrics: this.buildMetricsView(analysis, metrics),
    };
  }

  /**
   * Build unified metrics view (hydration, oil, acne, wrinkles) from entity and/or SkinMetric rows.
   */
  private buildMetricsView(analysis: SkinAnalysis, metrics: SkinMetric[]): AnalysisMetricsView {
    const fromEntity = (key: MetricKey): number => {
      const v = (analysis as any)[key];
      return typeof v === 'number' && !Number.isNaN(v) ? v : NaN;
    };
    const fromMetrics = (metricTypeMatch: string): number => {
      const m = metrics.find(
        x => x.metricType?.toLowerCase() === metricTypeMatch.toLowerCase()
      );
      return m != null ? m.score : NaN;
    };
    const num = (v: number) => (Number.isFinite(v) ? v : 0);
    return {
      hydration: num(fromEntity('hydration') ?? fromMetrics('hydration')),
      oil: num(fromEntity('oil') ?? fromMetrics('oil') ?? fromMetrics('enlarged-pores')),
      acne: num(fromEntity('acne') ?? fromMetrics('acne')),
      wrinkles: num(fromEntity('wrinkles') ?? fromMetrics('wrinkles')),
    };
  }

  /**
   * Compare two analyses: side-by-side metrics, differences, trend, rule-based summary.
   * Logs compared analysis IDs and metric values for debugging.
   */
  async compare(firstId: string, secondId: string): Promise<CompareAnalysisResultDto> {
    this.logger.log(`Compare requested: firstId=${firstId}, secondId=${secondId}`);

    const [first, second] = await Promise.all([
      this.analysisRepo.findOne({ where: { id: firstId } }),
      this.analysisRepo.findOne({ where: { id: secondId } }),
    ]);
    if (!first) throw new NotFoundException(`Analysis not found: ${firstId}`);
    if (!second) throw new NotFoundException(`Analysis not found: ${secondId}`);

    const [metricsFirst, metricsSecond] = await Promise.all([
      this.metricRepo.find({ where: { analysisId: firstId } }),
      this.metricRepo.find({ where: { analysisId: secondId } }),
    ]);

    const m1 = this.buildMetricsView(first, metricsFirst);
    const m2 = this.buildMetricsView(second, metricsSecond);

    this.logger.debug(`Analysis ${firstId} metrics: ${JSON.stringify(m1)} (SkinMetric count: ${metricsFirst.length})`);
    this.logger.debug(`Analysis ${secondId} metrics: ${JSON.stringify(m2)} (SkinMetric count: ${metricsSecond.length})`);

    const hasAnyMetric = (m: AnalysisMetricsView) =>
      m.hydration > 0 || m.oil > 0 || m.acne > 0 || m.wrinkles > 0;
    const metricsMissing = !hasAnyMetric(m1) && !hasAnyMetric(m2);
    const metricsMessage = metricsMissing
      ? 'Aucune donnée de métrique disponible pour ces analyses (hydratation, sébum, acné, rides). Les analyses ont peut-être été créées avant l\'enregistrement des métriques.'
      : undefined;

    const keys: MetricKey[] = ['hydration', 'oil', 'acne', 'wrinkles'];
    const THRESHOLD = 2;
    const differences: MetricDifference[] = keys.map(metric => {
      const firstVal = m1[metric];
      const secondVal = m2[metric];
      const delta = Math.round((secondVal - firstVal) * 10) / 10;
      let trend: 'improvement' | 'regression' | 'stable' = 'stable';
      if (metric === 'hydration' || metric === 'oil') {
        if (delta > THRESHOLD) trend = 'improvement';
        else if (delta < -THRESHOLD) trend = 'regression';
      } else {
        if (delta < -THRESHOLD) trend = 'improvement';
        else if (delta > THRESHOLD) trend = 'regression';
      }
      return { metric, firstValue: firstVal, secondValue: secondVal, delta, trend };
    });

    const scoreDelta = (second.skinScore ?? 0) - (first.skinScore ?? 0);
    let globalTrend: 'improvement' | 'regression' | 'stable' = 'stable';
    if (scoreDelta > THRESHOLD) globalTrend = 'improvement';
    else if (scoreDelta < -THRESHOLD) globalTrend = 'regression';

    const summaryText = this.buildComparisonSummary(
      { first, second, m1, m2, differences, globalTrend }
    );

    return {
      first: {
        id: first.id,
        skinScore: first.skinScore ?? 0,
        skinAge: first.skinAge ?? null,
        realAge: first.realAge ?? null,
        createdAt: first.createdAt.toISOString(),
        metrics: m1,
        summary: first.summary ?? null,
      },
      second: {
        id: second.id,
        skinScore: second.skinScore ?? 0,
        skinAge: second.skinAge ?? null,
        realAge: second.realAge ?? null,
        createdAt: second.createdAt.toISOString(),
        metrics: m2,
        summary: second.summary ?? null,
      },
      differences,
      globalTrend,
      summaryText,
      ...(metricsMissing && { metricsMissing: true, metricsMessage }),
    };
  }

  private buildComparisonSummary(params: {
    first: SkinAnalysis;
    second: SkinAnalysis;
    m1: AnalysisMetricsView;
    m2: AnalysisMetricsView;
    differences: MetricDifference[];
    globalTrend: 'improvement' | 'regression' | 'stable';
  }): string {
    const { first, second, m1, m2, differences, globalTrend } = params;
    const score1 = first.skinScore ?? 0;
    const score2 = second.skinScore ?? 0;
    const date1 = new Date(first.createdAt).toLocaleDateString('fr-FR');
    const date2 = new Date(second.createdAt).toLocaleDateString('fr-FR');
    const parts: string[] = [];

    if (globalTrend === 'improvement') {
      parts.push(`Entre le ${date1} et le ${date2}, votre peau s’est globalement améliorée : le score est passé de ${score1} à ${score2}/100.`);
    } else if (globalTrend === 'regression') {
      parts.push(`Entre le ${date1} et le ${date2}, une légère baisse du score global est observée (${score1} → ${score2}/100).`);
    } else {
      parts.push(`Entre le ${date1} et le ${date2}, le score global est resté stable (${score1} → ${score2}/100).`);
    }

    const improvements = differences.filter(d => d.trend === 'improvement');
    const regressions = differences.filter(d => d.trend === 'regression');
    const labels: Record<MetricKey, string> = {
      hydration: 'Hydratation',
      oil: 'Sébum',
      acne: 'Acné',
      wrinkles: 'Rides',
    };

    if (improvements.length) {
      parts.push(` Améliorations notables : ${improvements.map(d => `${labels[d.metric]} (${d.firstValue} → ${d.secondValue})`).join(', ')}.`);
    }
    if (regressions.length) {
      parts.push(` Points de vigilance : ${regressions.map(d => `${labels[d.metric]} (${d.firstValue} → ${d.secondValue})`).join(', ')}.`);
    }
    if (improvements.length === 0 && regressions.length === 0 && globalTrend === 'stable') {
      parts.push(' Les métriques détaillées (hydratation, sébum, acné, rides) sont restées stables.');
    }

    return parts.join('');
  }
}
