import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinMetric } from './skin-metric.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { ScoringService, MetricType } from '../scoring.service';
import { WeightsDto } from '../weights.dto';

@Injectable()
export class SkinMetricService {
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
}
