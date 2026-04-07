import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { Product } from '../products/entities/product.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RecommendationService } from '../recommendation/recommendation.service';
import { IncompatibilityService } from './incompatibility.service';
import { OpenRouterService } from '../ai/openrouter.service';

export type RoutineStepName = 'Cleanser' | 'Serum' | 'Moisturizer';

export interface RoutineProductDto {
  id: string;
  name: string;
  type: string;
  price: number;
  url: string | null;
}

export interface RoutineStepDto {
  stepOrder: number;
  stepName: RoutineStepName;
  notes?: string;
  product: RoutineProductDto;
}

export interface RoutineResponseDto {
  compatibilityWarning?: string;
  morning: { steps: RoutineStepDto[] };
  night: { steps: RoutineStepDto[] };
}

function inferSkinTypeFromAnalysis(analysis: SkinAnalysis | null): 'Dry' | 'Oily' | 'Sensitive' | 'Normal' {
  const oil = analysis?.oil ?? 0;
  const acne = analysis?.acne ?? 0;
  const wrinkles = analysis?.wrinkles ?? 0;
  const hydration = analysis?.hydration ?? 0;

  if (oil >= 65 || acne >= 65) return 'Oily';
  if (wrinkles >= 65 || hydration <= 60) return 'Dry';
  if (acne >= 55) return 'Sensitive';
  return 'Normal';
}

function normalizeType(type: unknown): string {
  return typeof type === 'string' ? type.trim() : '';
}

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);

  constructor(
    @InjectRepository(Routine)
    private readonly routineRepository: Repository<Routine>,
    @InjectRepository(RoutineStep)
    private readonly routineStepRepository: Repository<RoutineStep>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SkinAnalysis)
    private readonly skinAnalysisRepository: Repository<SkinAnalysis>,
    private readonly recommendationService: RecommendationService,
    private readonly incompatibilityService: IncompatibilityService,
    private readonly openRouterService: OpenRouterService,
  ) { }

  async getOrGenerateRoutine(userId: string): Promise<RoutineResponseDto> {
    // 1. Récupérer la dernière analyse complétée
    const lastAnalysis = await this.skinAnalysisRepository.findOne({
      where: { userId, status: 'COMPLETED' },
      order: { createdAt: 'DESC' },
    });

    if (!lastAnalysis) {
      this.logger.warn(`Aucune analyse trouvée pour l'utilisateur ${userId}. Génération d'une routine générique.`);
    }

    const skinType = inferSkinTypeFromAnalysis(lastAnalysis);
    const skinTypeLower = skinType === 'Normal' ? null : skinType.toLowerCase();
    
    // 2. Récupérer les recommandations liées à CETTE analyse spécifique
    // Si pas de recommendations pour cette analyse, on en génère de nouvelles
    let recommendations: any[] = [];
    if (lastAnalysis) {
      recommendations = await this.recommendationService.getRecommendationsForAnalysis(lastAnalysis.id);
    }

    // Fallback si aucune recommandation trouvée pour l'analyse
    if (!recommendations || recommendations.length === 0) {
      this.logger.log(`Pas de recommandations enregistrées pour l'analyse ${lastAnalysis?.id}. Utilisation des dernières recommandations globales.`);
      recommendations = await this.recommendationService.getLatestFinalRecommendationsForUser(userId);
    }

    // Second fallback : génération à la volée si vraiment rien de stocké
    if (!recommendations || recommendations.length === 0) {
      this.logger.log(`Génération de recommandations à la volée pour la routine (Type: ${skinType})`);
      recommendations = await this.recommendationService.getRecommendationsForSkinState(
          userId,
          lastAnalysis?.id || 'routine_temp',
          skinType,
        );
    }

    this.logger.log(`Base de ${recommendations.length} produits pour générer la routine.`);

    let aiRoutine: any = null;
    if (recommendations.length > 0) {
      try {
        aiRoutine = await this.openRouterService.generateRoutineFromRecommendations({
          recommendations,
          analysisResult: {
            skinType,
            hydration: lastAnalysis?.hydration ?? null,
            acne: lastAnalysis?.acne ?? null,
            wrinkles: lastAnalysis?.wrinkles ?? null,
            oil: lastAnalysis?.oil ?? null,
            skinScore: lastAnalysis?.skinScore ?? null,
            skinAge: lastAnalysis?.skinAge ?? null,
          },
        });
        this.logger.log(`Routine IA générée avec succès.`);
      } catch (err) {
        this.logger.error(`Erreur lors de la génération de la routine par l'IA: ${err.message}`);
        aiRoutine = null;
      }
    }

    // Persist routines
    // Note: on régénère à chaque appel pour rester cohérent avec l'analyse la plus récente.
    const routines = await Promise.all(
      (['AM', 'PM'] as const).map(async (type) => {
        const routine = this.routineRepository.create({
          userId,
          type,
          generatedByAI: true,
        });
        return this.routineRepository.save(routine);
      }),
    );

    const [amRoutine, pmRoutine] = routines;

    const buildStepsForType = (type: 'AM' | 'PM') => {
      const pickNth = (items: any[], n: number) => {
        if (items.length === 0) return null;
        const idx = Math.min(n, items.length - 1);
        return items[idx];
      };

      const fromAi = type === 'AM' ? aiRoutine?.morning : aiRoutine?.night;
      if (Array.isArray(fromAi) && fromAi.length > 0) {
        return fromAi
          .map((step: any, index: number) => {
            const matched = (recommendations || []).find((r: any) => r?.name === step?.productName);
            if (!matched) return null;

            return {
              stepOrder: index + 1,
              stepName: (step?.stepName || 'Serum') as RoutineStepName,
              rec: matched,
              notes: [step?.instruction, step?.reason].filter(Boolean).join(' '),
            };
          })
          .filter(Boolean);
      }

      const cleaners = (recommendations || []).filter((p: any) => {
        const t = normalizeType(p?.type).toLowerCase();
        return t.includes('cleanser');
      });
      const serums = (recommendations || []).filter((p: any) => {
        const t = normalizeType(p?.type).toLowerCase();
        return t.includes('serum');
      });
      const moisturizers = (recommendations || []).filter((p: any) => {
        const t = normalizeType(p?.type).toLowerCase();
        return t.includes('moisturiser') || t.includes('moisturizer');
      });

      // AM: 1er de chaque catégorie; PM: 2ème si dispo
      const cleanserRec = type === 'AM' ? pickNth(cleaners, 0) : pickNth(cleaners, 1);
      const serumRec = type === 'AM' ? pickNth(serums, 0) : pickNth(serums, 1);
      const moisturizerRec = type === 'AM' ? pickNth(moisturizers, 0) : pickNth(moisturizers, 1);

      return [
        { stepOrder: 1, stepName: 'Cleanser' as const, rec: cleanserRec, notes: 'Utiliser en premiere etape pour nettoyer la peau.' },
        { stepOrder: 2, stepName: 'Serum' as const, rec: serumRec, notes: 'Appliquer sur peau propre avant la creme.' },
        { stepOrder: 3, stepName: 'Moisturizer' as const, rec: moisturizerRec, notes: 'Sceller l hydratation en derniere etape.' },
      ];
    };

    const amSteps = buildStepsForType('AM');
    const pmSteps = buildStepsForType('PM');

    const resolveProduct = async (rec: any): Promise<Product | null> => {
      if (!rec) return null;

      const normalizeUrl = (u: unknown): string | null => {
        if (typeof u !== 'string') return null;
        const trimmed = u.trim();
        if (!trimmed || trimmed === '#') return null;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        if (trimmed.startsWith('//')) return `https:${trimmed}`;
        return `https://${trimmed}`;
      };

      const normalizedRecUrl = normalizeUrl(rec?.url);

      // Cas "python output": pas d'id, seulement (name/type/price/url/skinType)
      if (rec.id) {
        const byId = await this.productRepository.findOne({ where: { id: rec.id } });
        if (byId) {
          // Si le produit en DB n'a pas (ou plus) d'URL valide, on la récupère depuis la recommandation.
          if (normalizedRecUrl) {
            const current = typeof byId.url === 'string' ? byId.url.trim() : '';
            if (!current || current === '#' || !current.startsWith('http')) {
              byId.url = normalizedRecUrl;
              await this.productRepository.save(byId);
            }
          }
          return byId;
        }
      }

      const name = normalizeType(rec.name);
      if (!name) return null;

      const byName = await this.productRepository.findOne({ where: { name } });
      if (byName && normalizedRecUrl) {
        const current = typeof byName.url === 'string' ? byName.url.trim() : '';
        if (!current || current === '#' || !current.startsWith('http')) {
          byName.url = normalizedRecUrl;
          await this.productRepository.save(byName);
        }
      }

      return byName;
    };

    const findFallbackProduct = async (stepName: RoutineStepName): Promise<Product | null> => {
      const typeKeyword = stepName === 'Moisturizer' ? 'Moistur' : stepName;

      const bySkin = skinTypeLower
        ? await this.productRepository.findOne({
          where: { skinType: skinTypeLower, type: Like(`%${typeKeyword}%`) },
        })
        : null;

      if (bySkin) return bySkin;

      return this.productRepository.findOne({
        where: { type: Like(`%${typeKeyword}%`) },
      });
    };

    const allowFallbackProduct = recommendations.length === 0;

    const buildAndSaveSteps = async (routineId: string, steps: any[]) => {
      const resolved = await Promise.all(
        steps.map(async (s) => {
          const productFromRec = await resolveProduct(s.rec);
          const product = productFromRec ?? (allowFallbackProduct ? (await findFallbackProduct(s.stepName as RoutineStepName)) : null);
          if (!product) return null; // still possible if DB is empty/unseeded
          const step = this.routineStepRepository.create({
            routineId,
            productId: product.id,
            stepOrder: s.stepOrder,
            notes: s.notes || s.stepName,
          });
          return step;
        }),
      );

      const toSave = resolved.filter(Boolean) as RoutineStep[];
      await this.routineStepRepository.save(toSave);

      return toSave;
    };

    await buildAndSaveSteps(amRoutine.id, amSteps);
    await buildAndSaveSteps(pmRoutine.id, pmSteps);

    // Recharger en DTO triés par stepOrder
    const amDto = await this.buildRoutineDto(amRoutine.id);
    const pmDto = await this.buildRoutineDto(pmRoutine.id);

    const productIds = [...amDto, ...pmDto].map(s => s.product.id);
    const allStepProducts = productIds.length ? await this.productRepository.find({
      where: {
        id: In(productIds)
      }
    }) : [];
    
    const checkResult = this.incompatibilityService.checkRoutine(allStepProducts);

    return {
      compatibilityWarning: checkResult.message,
      morning: { steps: amDto },
      night: { steps: pmDto },
    };
  }

  private async buildRoutineDto(routineId: string): Promise<RoutineStepDto[]> {
    const steps = await this.routineStepRepository.find({
      where: { routineId },
      order: { stepOrder: 'ASC' },
    });

    if (!steps.length) return [];

    const productIds = steps.map((s) => s.productId);
    const products = await this.productRepository.find({ where: { id: In(productIds) } });
    const productById = new Map(products.map((p) => [p.id, p]));

    const toName = (order: number): RoutineStepName => {
      if (order === 1) return 'Cleanser';
      if (order === 2) return 'Serum';
      return 'Moisturizer';
    };

    return steps
      .map((s) => {
        const product = productById.get(s.productId);
        if (!product) return null;
        return {
          stepOrder: s.stepOrder,
          stepName: toName(s.stepOrder),
          notes: s.notes ?? undefined,
          product: {
            id: product.id,
            name: product.name,
            type: product.type,
            price: product.price,
            url: product.url ?? null,
          },
        };
      })
      .filter(Boolean) as RoutineStepDto[];
  }
}

