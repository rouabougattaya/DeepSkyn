import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { Product } from '../products/entities/product.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RoutinePersonalization } from './routine-personalization.entity';
import { RecommendationService } from '../recommendation/recommendation.service';
import { InsightsService } from '../insights/insights.service';
import { IncompatibilityService } from './incompatibility.service';
import {
    UpdateRoutineDto,
    TrendDetail,
    TrendSnapshot,
    AdjustmentRule,
    PersonalizedStepDto,
    RoutineUpdateResponseDto,
} from './routine-personalization.dto';

type RoutineStepName = 'Cleanser' | 'Serum' | 'Moisturizer' | 'Sunscreen' | 'Treatment';

/* ────────────────────────────────────────────
 *  Helpers
 * ──────────────────────────────────────────── */

function inferSkinTypeFromAnalysis(
    analysis: SkinAnalysis | null,
): 'Dry' | 'Oily' | 'Sensitive' | 'Normal' {
    const oil = analysis?.oil ?? 0;
    const acne = analysis?.acne ?? 0;
    const wrinkles = analysis?.wrinkles ?? 0;
    const hydration = analysis?.hydration ?? 0;

    if (oil >= 65 || acne >= 65) return 'Oily';
    if (wrinkles >= 65 || hydration <= 60) return 'Dry';
    if (acne >= 55) return 'Sensitive';
    return 'Normal';
}

function computeTrendDetail(
    current: number,
    previous: number,
    invertBetter: boolean = false,
): TrendDetail {
    const delta = Math.round((current - previous) * 10) / 10;
    const THRESHOLD = 3;
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';

    if (invertBetter) {
        // For acne / wrinkles: going DOWN is improving
        if (delta < -THRESHOLD) trend = 'improving';
        else if (delta > THRESHOLD) trend = 'worsening';
    } else {
        // For hydration / oil: going UP is improving
        if (delta > THRESHOLD) trend = 'improving';
        else if (delta < -THRESHOLD) trend = 'worsening';
    }

    return { current, previous, delta, trend };
}

/* ────────────────────────────────────────────
 *  Service
 * ──────────────────────────────────────────── */

@Injectable()
export class RoutinePersonalizationService {
    private readonly logger = new Logger(RoutinePersonalizationService.name);

    constructor(
        @InjectRepository(Routine)
        private readonly routineRepo: Repository<Routine>,
        @InjectRepository(RoutineStep)
        private readonly stepRepo: Repository<RoutineStep>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        @InjectRepository(SkinAnalysis)
        private readonly analysisRepo: Repository<SkinAnalysis>,
        @InjectRepository(RoutinePersonalization)
        private readonly personalizationRepo: Repository<RoutinePersonalization>,
        private readonly recommendationService: RecommendationService,
        private readonly insightsService: InsightsService,
        private readonly incompatibilityService: IncompatibilityService,
    ) { }

    /* ───────────── PUBLIC ───────────── */

    async personalizeRoutine(
        userId: string,
        dto: UpdateRoutineDto,
    ): Promise<RoutineUpdateResponseDto> {
        this.logger.log(`personalizeRoutine called for userId=${userId}`);

        // 1. Fetch the last completed analyses (at least 2 for trend computation)
        const analyses = await this.analysisRepo.find({
            where: { userId, status: 'COMPLETED' },
            order: { createdAt: 'DESC' },
            take: 10,
        });

        const latest = analyses[0] ?? null;
        const previous = analyses[1] ?? latest; // fallback to same if only 1

        // 2. Infer skin type from latest
        const skinType = inferSkinTypeFromAnalysis(latest);
        this.logger.log(`Inferred skin type: ${skinType}`);

        // 3. Compute trends (dashboard-style)
        const trends = this.computeTrends(latest, previous, analyses);

        // 4. Determine adjustment rules
        const adjustments = this.buildAdjustmentRules(trends, skinType);
        this.logger.log(`Applied ${adjustments.length} adjustment rules`);

        // 5. Get base recommendations from the latest analysis
        let recommendations = latest ? await this.recommendationService.getRecommendationsForAnalysis(latest.id) : [];

        // Fallback if none found
        if (!recommendations || recommendations.length === 0) {
            this.logger.log('No recommendations found for latest analysis, using skin state fallback.');
            recommendations = await this.recommendationService.getRecommendationsForSkinState(
                userId,
                'personalization',
                skinType,
            );
        }

        // 6. Build personalized AM / PM routines
        const [amRoutine, pmRoutine] = await Promise.all(
            (['AM', 'PM'] as const).map(async (type) => {
                const routine = this.routineRepo.create({
                    userId,
                    type,
                    generatedByAI: true,
                });
                return this.routineRepo.save(routine);
            }),
        );

        const amSteps = await this.buildPersonalizedSteps(
            amRoutine.id,
            'AM',
            recommendations,
            adjustments,
            skinType,
        );
        const pmSteps = await this.buildPersonalizedSteps(
            pmRoutine.id,
            'PM',
            recommendations,
            adjustments,
            skinType,
        );

        // 7. Persist the personalization event for audit
        const personalization = this.personalizationRepo.create({
            userId,
            inferredSkinType: skinType,
            trendSnapshot: {
                hydration: { current: trends.hydration.current, previous: trends.hydration.previous, trend: trends.hydration.trend },
                oil: { current: trends.oil.current, previous: trends.oil.previous, trend: trends.oil.trend },
                acne: { current: trends.acne.current, previous: trends.acne.previous, trend: trends.acne.trend },
                wrinkles: { current: trends.wrinkles.current, previous: trends.wrinkles.previous, trend: trends.wrinkles.trend },
                globalScoreTrend: trends.globalScoreTrend,
            },
            appliedAdjustments: adjustments,
            amRoutineId: amRoutine.id,
            pmRoutineId: pmRoutine.id,
            analysisCount: analyses.length,
        });
        await this.personalizationRepo.save(personalization);

        const allStepProducts = await this.productRepo.find({
            where: {
                id: In([...amSteps, ...pmSteps].map((s) => s.product.id)),
            },
        });
        const checkResult = this.incompatibilityService.checkRoutine(allStepProducts);

        return {
            compatibilityWarning: checkResult.message,
            message: 'Routine personnalisée mise à jour avec succès.',
            personalizationId: personalization.id,
            inferredSkinType: skinType,
            analysisCount: analyses.length,
            trends,
            adjustments,
            routine: {
                morning: { steps: amSteps },
                night: { steps: pmSteps },
            },
        };
    }

    /* ───────────── TREND COMPUTATION ───────────── */

    private computeTrends(
        latest: SkinAnalysis | null,
        previous: SkinAnalysis | null,
        _allAnalyses: SkinAnalysis[],
    ): TrendSnapshot {
        const hydration = computeTrendDetail(latest?.hydration ?? 0, previous?.hydration ?? 0, false);
        const oil = computeTrendDetail(latest?.oil ?? 0, previous?.oil ?? 0, false);
        const acne = computeTrendDetail(latest?.acne ?? 0, previous?.acne ?? 0, true);
        const wrinkles = computeTrendDetail(latest?.wrinkles ?? 0, previous?.wrinkles ?? 0, true);

        // Global score trend
        const latestScore = latest?.skinScore ?? 0;
        const previousScore = previous?.skinScore ?? 0;
        const scoreDelta = latestScore - previousScore;
        let globalScoreTrend: 'improving' | 'worsening' | 'stable' = 'stable';
        if (scoreDelta > 3) globalScoreTrend = 'improving';
        else if (scoreDelta < -3) globalScoreTrend = 'worsening';

        return { hydration, oil, acne, wrinkles, globalScoreTrend };
    }

    /* ───────────── ADJUSTMENT RULES ENGINE ───────────── */

    private buildAdjustmentRules(
        trends: TrendSnapshot,
        skinType: string,
    ): AdjustmentRule[] {
        const rules: AdjustmentRule[] = [];

        // Rule 1: Acne worsening → prioritize anti-acne serums
        if (trends.acne.trend === 'worsening') {
            rules.push({
                rule: 'ACNE_WORSENING',
                action: 'Privilégier sérum anti-acné (niacinamide, acide salicylique)',
                reason: `Acné en hausse: ${trends.acne.previous} → ${trends.acne.current} (+${trends.acne.delta})`,
            });
        }

        // Rule 2: Hydration dropping → reinforce moisturizer
        if (trends.hydration.trend === 'worsening') {
            rules.push({
                rule: 'HYDRATION_DROP',
                action: 'Renforcer le moisturizer (acide hyaluronique, céramides)',
                reason: `Hydratation en baisse: ${trends.hydration.previous} → ${trends.hydration.current} (${trends.hydration.delta})`,
            });
        }

        // Rule 3: Oil/sebum increasing → purifying cleanser
        if (trends.oil.trend === 'worsening') {
            rules.push({
                rule: 'OIL_INCREASE',
                action: 'Cleanser purifiant (argile, charbon actif)',
                reason: `Sébum en baisse: ${trends.oil.previous} → ${trends.oil.current} (${trends.oil.delta})`,
            });
        }

        // Rule 4: Wrinkles worsening → anti-aging serum
        if (trends.wrinkles.trend === 'worsening') {
            rules.push({
                rule: 'WRINKLES_INCREASE',
                action: 'Sérum anti-rides (rétinol, peptides, vitamine C)',
                reason: `Rides en hausse: ${trends.wrinkles.previous} → ${trends.wrinkles.current} (+${trends.wrinkles.delta})`,
            });
        }

        // Rule 5: Global improving + stable metrics → suggest upgrade
        if (
            trends.globalScoreTrend === 'improving' &&
            trends.acne.trend === 'stable' &&
            trends.hydration.trend === 'stable'
        ) {
            rules.push({
                rule: 'UPGRADE_OPPORTUNITY',
                action: 'Ajouter un soin ciblé supplémentaire (masque, exfoliant doux)',
                reason: 'Score en amélioration continue, parfait pour intensifier la routine.',
            });
        }

        // Rule 6: Global worsening → simplify routine
        if (trends.globalScoreTrend === 'worsening') {
            rules.push({
                rule: 'SIMPLIFY_ROUTINE',
                action: 'Simplifier la routine — revenir aux essentiels (cleanser, moisturizer, SPF)',
                reason: 'Score global en baisse — une routine plus simple peut aider la peau à récupérer.',
            });
        }

        // Rule 7: Skin-type-specific boosts
        if (skinType === 'Sensitive') {
            rules.push({
                rule: 'SENSITIVE_CARE',
                action: 'Produits hypoallergéniques, sans parfum',
                reason: 'Type de peau détecté : Sensible — éviter les irritants.',
            });
        }

        return rules;
    }

    /* ───────────── PERSONALIZED STEP BUILDER ───────────── */

    private async buildPersonalizedSteps(
        routineId: string,
        type: 'AM' | 'PM',
        recommendations: any[],
        adjustments: AdjustmentRule[],
        skinType: string,
    ): Promise<PersonalizedStepDto[]> {
        const normalizeType = (t: unknown): string =>
            typeof t === 'string' ? t.trim().toLowerCase() : '';

        const recs = recommendations || [];

        const cleaners = recs.filter((p: any) => normalizeType(p?.type).includes('cleanser'));
        const serums = recs.filter((p: any) => normalizeType(p?.type).includes('serum'));
        const moisturizers = recs.filter((p: any) => {
            const t = normalizeType(p?.type);
            return t.includes('moisturiser') || t.includes('moisturizer');
        });

        const pickNth = (items: any[], n: number) => {
            if (items.length === 0) return null;
            return items[Math.min(n, items.length - 1)];
        };

        // AM gets first product, PM gets second (if available)
        const offset = type === 'AM' ? 0 : 1;

        // Check which adjustments are active to annotate steps
        const activeRules = new Set(adjustments.map((a) => a.rule));

        const steps: {
            stepOrder: number;
            stepName: RoutineStepName;
            rec: any;
            adjustmentReason?: string;
        }[] = [
                {
                    stepOrder: 1,
                    stepName: 'Cleanser',
                    rec: pickNth(cleaners, offset),
                    adjustmentReason: activeRules.has('OIL_INCREASE')
                        ? 'Cleanser purifiant sélectionné (sébum élevé)'
                        : undefined,
                },
                {
                    stepOrder: 2,
                    stepName: 'Serum',
                    rec: pickNth(serums, offset),
                    adjustmentReason: this.resolveSerumAdjustmentReason(activeRules),
                },
                {
                    stepOrder: 3,
                    stepName: 'Moisturizer',
                    rec: pickNth(moisturizers, offset),
                    adjustmentReason: activeRules.has('HYDRATION_DROP')
                        ? 'Moisturizer renforcé (hydratation en baisse)'
                        : undefined,
                },
            ];

        // Resolve products & save steps
        const resolved: PersonalizedStepDto[] = [];

        for (const s of steps) {
            const product = await this.resolveProduct(s.rec, s.stepName, skinType);
            if (!product) continue;

            const stepEntity = this.stepRepo.create({
                routineId,
                productId: product.id,
                stepOrder: s.stepOrder,
                notes: s.adjustmentReason || s.stepName,
            });
            await this.stepRepo.save(stepEntity);

            resolved.push({
                stepOrder: s.stepOrder,
                stepName: s.stepName,
                notes: stepEntity.notes ?? undefined,
                adjustmentReason: s.adjustmentReason,
                product: {
                    id: product.id,
                    name: product.name,
                    type: product.type,
                    price: product.price,
                    url: product.url ?? null,
                },
            });
        }

        return resolved;
    }

    /* ───────────── PRODUCT RESOLVER ───────────── */

    private async resolveProduct(
        rec: any,
        stepName: RoutineStepName,
        skinType: string,
    ): Promise<Product | null> {
        if (rec) {
            // Try by ID first
            if (rec.id) {
                const byId = await this.productRepo.findOne({ where: { id: rec.id } });
                if (byId) return byId;
            }
            // Try by name
            const name = typeof rec.name === 'string' ? rec.name.trim() : '';
            if (name) {
                const byName = await this.productRepo.findOne({ where: { name } });
                if (byName) return byName;
            }
        }

        // Fallback: find a product matching the step category + skin type
        const typeKeyword = stepName === 'Moisturizer' ? 'Moistur' : stepName;
        const skinTypeLower = skinType.toLowerCase();

        const bySkin = await this.productRepo.findOne({
            where: { skinType: skinTypeLower, type: Like(`%${typeKeyword}%`) },
        });
        if (bySkin) return bySkin;

        return this.productRepo.findOne({
            where: { type: Like(`%${typeKeyword}%`) },
        });
    }

    private resolveSerumAdjustmentReason(activeRules: Set<string>): string | undefined {
        if (activeRules.has('ACNE_WORSENING')) return 'Sérum anti-acné priorisé';
        if (activeRules.has('WRINKLES_INCREASE')) return 'Sérum anti-rides priorisé';
        return undefined;
    }
}
