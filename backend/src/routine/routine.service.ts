import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Routine } from './routine.entity';
import { RoutineStep } from '../routineStep/routine-step.entity';
import { Product } from '../recommendation/product.entity';
import { SkinAnalysis } from '../skinAnalysis/skin-analysis.entity';
import { RecommendationService } from '../recommendation/recommendation.service';

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
  ) {}

  async getOrGenerateRoutine(userId: string): Promise<RoutineResponseDto> {
    // Récupérer la dernière analyse complétée pour adapter le builder
    const lastAnalysis = await this.skinAnalysisRepository.findOne({
      where: { userId, status: 'COMPLETED' },
      order: { createdAt: 'DESC' },
    });

    const skinType = inferSkinTypeFromAnalysis(lastAnalysis);
    const skinTypeLower = skinType === 'Normal' ? null : skinType.toLowerCase();

    // Générer des recommandations à partir du skinType inféré
    const recommendations = await this.recommendationService.getRecommendationsForSkinState(
      userId,
      'routine_temp',
      skinType,
    );

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
        { stepOrder: 1, stepName: 'Cleanser' as const, rec: cleanserRec },
        { stepOrder: 2, stepName: 'Serum' as const, rec: serumRec },
        { stepOrder: 3, stepName: 'Moisturizer' as const, rec: moisturizerRec },
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

    const buildAndSaveSteps = async (routineId: string, steps: any[]) => {
      const resolved = await Promise.all(
        steps.map(async (s) => {
          const productFromRec = await resolveProduct(s.rec);
          const product = productFromRec ?? (await findFallbackProduct(s.stepName as RoutineStepName));
          if (!product) return null; // still possible if DB is empty/unseeded
          const step = this.routineStepRepository.create({
            routineId,
            productId: product.id,
            stepOrder: s.stepOrder,
            notes: s.stepName,
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

    return {
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

