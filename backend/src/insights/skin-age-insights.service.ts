import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinMetricService } from '../skinMetric/skin-metric.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { User } from '../user/user.entity';
import { UserProfile } from '../userProfile/user-profile.entity';
import * as fs from 'fs';
import * as path from 'path';

export type SkinAgeStatus = 'younger' | 'aligned' | 'older' | 'unknown';

export interface SkinAgeInsightResponse {
  userId: string;
  status: SkinAgeStatus;
  delta: number | null;
  headline: string;
  advice: string[];
  productSuggestions: string[];
  latestAnalysis?: {
    id: string;
    createdAt: string;
    skinAge: number | null;
    realAge: number | null;
    skinScore: number | null;
  };
  trend?: {
    averageDelta: number | null;
    series: { createdAt: string; delta: number | null }[];
  };
  products?: any[];
  userBenchmark: {
    sampleSize: number;
    avgDelta: number | null;
    avgSkinAge: number | null;
    avgRealAge: number | null;
  };
  datasetBenchmark: {
    sampleSize: number;
    avgDelta: number;
    avgSkinAge: number;
    avgRealAge: number;
  };
}

interface DatasetStats {
  sampleSize: number;
  avgDelta: number;
  avgSkinAge: number;
  avgRealAge: number;
}

@Injectable()
export class SkinAgeInsightsService {
  private readonly logger = new Logger(SkinAgeInsightsService.name);
  private datasetStatsPromise: Promise<DatasetStats> | null = null;

  constructor(
    private readonly skinMetricService: SkinMetricService,
    private readonly recommendationService: RecommendationService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  async getInsights(userId: string): Promise<SkinAgeInsightResponse> {
    const [series, datasetBenchmark] = await Promise.all([
      this.skinMetricService.getUserSkinAgeSeries(userId, 5),
      this.loadDatasetStats(),
    ]);

    const mappedSeries = series.map(item => ({
      ...item,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
    }));

    // CRITICAL: Do NOT fall back to birthDate calculation
    // realAge MUST come only from the analysis form input
    // If it's null, it stays null - no fallback logic
    if (mappedSeries[0] && mappedSeries[0].realAge == null) {
      console.warn(`[getInsights] Analysis has no realAge - user didn't provide age during analysis`);
    }

    const latest = mappedSeries[0];
    const delta = this.computeDelta(latest?.skinAge, latest?.realAge);
    const trend = this.computeTrend(mappedSeries);
    const userBenchmark = this.computeUserStats(mappedSeries);
    const status = this.computeStatus(delta);

    // Debug logging to verify condition scores are available
    if (latest) {
      console.log(`[getInsights] Latest analysis loaded - acne: ${(latest as any).acne}, oil: ${(latest as any).oil}, hydration: ${(latest as any).hydration}, wrinkles: ${(latest as any).wrinkles}`);
      console.log(`[getInsights] realAge from analysis: ${latest.realAge}, skinAge: ${latest.skinAge}`);
    }

    const { headline, advice, productSuggestions } = this.buildGuidance({ 
      status, 
      delta, 
      trendAverage: trend.averageDelta,
      latest: mappedSeries[0]
    });

    if (!latest) {
      return {
        userId,
        status: 'unknown',
        delta: null,
        headline: 'Aucune analyse enregistrée',
        advice: ['Réalisez une première analyse pour débloquer les insights âge de peau.'],
        productSuggestions: ['Démarrer une analyse IA', 'Mettre à jour votre âge réel dans le profil'],
        latestAnalysis: undefined,
        trend,
        products: [],
        userBenchmark,
        datasetBenchmark,
      };
    }

    const skinType = this.inferSkinType(
      latest.skinScore,
      delta,
      (latest as any).acne,
      (latest as any).oil,
      (latest as any).hydration,
      (latest as any).wrinkles
    );
    const products = await this.recommendationService.getRecommendationsForSkinState(
      userId,
      latest.id,
      skinType,
    );

    return {
      userId,
      status,
      delta,
      headline,
      advice,
      productSuggestions,
      products,
      latestAnalysis: {
        id: latest.id,
        createdAt: latest.createdAt,
        skinAge: latest.skinAge,
        realAge: latest.realAge,
        skinScore: latest.skinScore,
      },
      trend,
      userBenchmark,
      datasetBenchmark,
    };
  }

  private inferSkinType(
    skinScore?: number | null,
    delta?: number | null,
    acne?: number | null,
    oil?: number | null,
    hydration?: number | null,
    wrinkles?: number | null
  ): string {
    // Oily: high acne, high oil, high pore visibility
    if ((acne != null && acne > 60) || (oil != null && oil > 65)) return 'Oily';
    
    // Dry: low hydration, high wrinkles, low oil
    if ((hydration != null && hydration < 35) || (wrinkles != null && wrinkles > 60)) return 'Dry';
    
    // Sensitive: if skin is aging but hydration is moderate (needs care)
    if (delta != null && delta >= 4) {
      if (hydration != null && hydration > 40) return 'Sensitive';
      if (acne != null && acne > 30) return 'Sensitive';
      return 'Dry'; // Aging skin often needs more hydration
    }
    
    // Combination: moderate levels of multiple concerns
    if ((acne != null && acne > 30 && acne <= 60) && (oil != null && oil > 40 && oil <= 65)) return 'Combination';
    
    // Normal/Aligned: balanced metrics
    if (delta != null && delta <= -3) return 'Normal';
    
    return 'Normal';
  }

  private async getBirthDate(userId: string): Promise<Date | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.birthDate) return new Date(user.birthDate);

    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (profile?.birthDate) return new Date(profile.birthDate);
    return null;
  }

  private calculateRealAge(birthDate: Date | null): number | null {
    if (!birthDate) return null;
    const ts = birthDate.getTime();
    if (Number.isNaN(ts)) return null;
    const ageMs = Date.now() - ts;
    const years = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
    return Number.isFinite(years) ? years : null;
  }

  private computeUserStats(series: { skinAge: number | null; realAge: number | null }[]) {
    const valid = series.filter(item => item.skinAge != null && item.realAge != null) as { skinAge: number; realAge: number }[];
    const sampleSize = valid.length;
    if (sampleSize === 0) return { sampleSize: 0, avgDelta: null, avgSkinAge: null, avgRealAge: null };

    const sumSkin = valid.reduce((s, v) => s + v.skinAge, 0);
    const sumReal = valid.reduce((s, v) => s + v.realAge, 0);
    const avgSkinAge = Math.round((sumSkin / sampleSize) * 100) / 100;
    const avgRealAge = Math.round((sumReal / sampleSize) * 100) / 100;
    const avgDelta = Math.round(((sumSkin - sumReal) / sampleSize) * 100) / 100;

    return { sampleSize, avgDelta, avgSkinAge, avgRealAge };
  }

  private computeDelta(skinAge?: number | null, realAge?: number | null): number | null {
    if (skinAge == null || realAge == null) return null;
    const delta = skinAge - realAge;
    if (!Number.isFinite(delta)) return null;
    return Math.round(delta * 10) / 10;
  }

  private computeTrend(series: { createdAt: string; skinAge: number | null; realAge: number | null }[]) {
    const deltas = series
      .map(item => this.computeDelta(item.skinAge, item.realAge))
      .filter((d): d is number => d !== null);

    const averageDelta = deltas.length ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10 : null;

    return {
      averageDelta,
      series: series.map(item => ({
        createdAt: item.createdAt,
        delta: this.computeDelta(item.skinAge, item.realAge),
      })),
    };
  }

  private computeStatus(delta: number | null): SkinAgeStatus {
    if (delta === null) return 'unknown';
    if (delta <= -3) return 'younger';
    if (delta >= 4) return 'older';
    return 'aligned';
  }

  private buildGuidance({ status, delta, trendAverage, latest }: { status: SkinAgeStatus; delta: number | null; trendAverage: number | null; latest?: any }) {
    const advice: string[] = [];
    const productSuggestions: string[] = [];
    let headline = '';

    switch (status) {
      case 'younger':
        headline = 'Your skin looks younger than your real age — keep it up!';
        advice.push('Maintenez la protection SPF quotidienne.', 'Conservez une hydratation régulière (acide hyaluronique).');
        productSuggestions.push('Moisturizer hydratant', 'Sérum antioxydant (vitamine C)');
        break;
      case 'older':
        headline = 'Your skin age is higher than your real age — let’s correct it.';
        advice.push('Ajoutez un actif anti-âge (rétinol ou bakuchiol) 2-3x/semaine.', 'Renforcez la réparation nocturne avec un sérum peptides + niacinamide.', 'SPF 50 quotidien pour limiter l’oxydation.');
        productSuggestions.push('Sérum anti-âge', 'Crème nourrissante nuit', 'Écran solaire SPF 50');
        break;
      case 'aligned':
        headline = 'Your skin age matches your real age — stay consistent!';
        advice.push('Stabilisez votre routine : nettoyant doux + hydratant léger.', 'Ajoutez un sérum antioxydant pour progresser.');
        productSuggestions.push('Nettoyant doux', 'Sérum antioxydant', 'Crème hydratante légère');
        break;
      default:
        headline = 'No skin age data yet.';
        advice.push('Effectuez une nouvelle analyse avec votre âge réel renseigné.');
        productSuggestions.push('Lancer une analyse IA');
        break;
    }

    // Add condition-specific advice based on the latest analysis scores
    if (latest) {
      const acne = (latest as any).acne ?? null;
      const hydration = (latest as any).hydration ?? null;
      const wrinkles = (latest as any).wrinkles ?? null;
      const oil = (latest as any).oil ?? null;

      console.log(`[buildGuidance] Condition scores - acne: ${acne}, hydration: ${hydration}, wrinkles: ${wrinkles}, oil: ${oil}`);

      // Acne advice (higher score = worse acne)
      if (typeof acne === 'number' && acne >= 50) {
        if (acne > 70) {
          advice.push('Acne significative detectee: nettoyant doux 2x/jour + niacinamide pour reducer les inflammations.');
        } else if (acne >= 50) {
          advice.push('Acne moderee: exfoliant doux 2-3x/semaine + acide salicylique en lotion ciblée.');
        }
      }

      // Hydration advice (lower score = more dehydrated)
      if (typeof hydration === 'number' && hydration <= 60) {
        if (hydration < 40) {
          advice.push('Deshydratation severe: booster l\'hydratation avec acide hyaluronique + glycérine + ceramides en couches.');
        } else if (hydration <= 60) {
          advice.push('Hydratation faible: ajouter un essence hydratant ou un toner avant la creme.');
        }
      }

      // Wrinkles advice (higher score = more wrinkles)
      if (typeof wrinkles === 'number' && wrinkles >= 45) {
        if (wrinkles > 70) {
          advice.push('Rides profondes: commencez avec retinol 0.25% et augmentez progressivement + serum peptides la nuit.');
        } else if (wrinkles >= 45) {
          advice.push('Ridules presentes: vitamine C le matin + creme contour yeux aux peptides le soir.');
        }
      }

      // Oil advice (higher score = more oily)
      if (typeof oil === 'number' && oil >= 50) {
        if (oil > 70) {
          advice.push('Peau tres grasse: nettoyant gel + serum matifiant 2x/jour + crème legère non-comedogene.');
        } else if (oil >= 50) {
          advice.push('Peau grasse: utiliser une creme legère matifiante et papiers absorbants dans la journée.');
        }
      }
    }

    if (trendAverage != null) {
      if (trendAverage > 2) {
        advice.push('Tendance à l’augmentation : limitez les irritants et privilégiez les actifs apaisants.');
      } else if (trendAverage < -1) {
        advice.push('Tendance positive : conservez la fréquence actuelle et surveillez l’hydratation.');
      }
    }

    if (delta != null) {
      advice.push(`Écart actuel peau vs réel : ${delta >= 0 ? '+' : ''}${delta} ans.`);
    }

    return { headline, advice, productSuggestions };
  }

  private async loadDatasetStats(): Promise<DatasetStats> {
    if (this.datasetStatsPromise) return this.datasetStatsPromise;

    this.datasetStatsPromise = (async () => {
      const fallback: DatasetStats = { sampleSize: 0, avgDelta: 0, avgSkinAge: 0, avgRealAge: 0 };
      try {
        const filePath = path.join(process.cwd(), 'data', 'skin_analysis_dataset.csv');
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.trim().split(/\r?\n/).slice(1);

        let sampleSize = 0;
        let sumDelta = 0;
        let sumSkin = 0;
        let sumReal = 0;

        for (const line of lines) {
          const cols = line.split(',');
          if (cols.length < 9) continue;
          const realAge = parseFloat(cols[1]);
          const skinAge = parseFloat(cols[6]);
          if (!Number.isFinite(realAge) || !Number.isFinite(skinAge)) continue;
          sampleSize += 1;
          sumReal += realAge;
          sumSkin += skinAge;
          sumDelta += skinAge - realAge;
        }

        if (sampleSize === 0) return fallback;

        return {
          sampleSize,
          avgDelta: Math.round((sumDelta / sampleSize) * 100) / 100,
          avgSkinAge: Math.round((sumSkin / sampleSize) * 100) / 100,
          avgRealAge: Math.round((sumReal / sampleSize) * 100) / 100,
        };
      } catch (err) {
        this.logger.warn(`Unable to load skin_age dataset: ${err instanceof Error ? err.message : err}`);
        return fallback;
      }
    })();

    return this.datasetStatsPromise;
  }
}
