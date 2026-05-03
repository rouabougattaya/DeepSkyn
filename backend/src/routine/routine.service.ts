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
    const lastAnalysis = await this.getLastAnalysis(userId);
    const skinType = inferSkinTypeFromAnalysis(lastAnalysis);
    const recommendations = await this.gatherRecommendations(userId, lastAnalysis, skinType);

    const aiRoutine = await this.generateAIRoutine(recommendations, lastAnalysis, skinType);
    const [amRoutine, pmRoutine] = await this.initializeRoutines(userId);

    await this.processRoutineSteps(amRoutine.id, 'AM', aiRoutine, recommendations, skinType);
    await this.processRoutineSteps(pmRoutine.id, 'PM', aiRoutine, recommendations, skinType);

    return this.buildRoutineResponse(amRoutine.id, pmRoutine.id);
  }

  private async getLastAnalysis(userId: string) {
    return this.skinAnalysisRepository.findOne({
      where: { userId, status: 'COMPLETED' },
      order: { createdAt: 'DESC' },
    });
  }

  private async gatherRecommendations(userId: string, lastAnalysis: SkinAnalysis | null, skinType: string) {
    let recommendations: any[] = [];
    if (lastAnalysis) {
      recommendations = await this.recommendationService.getRecommendationsForAnalysis(lastAnalysis.id);
    }

    if (!recommendations?.length) {
      recommendations = await this.recommendationService.getLatestFinalRecommendationsForUser(userId);
    }

    if (!recommendations?.length) {
      recommendations = await this.recommendationService.getRecommendationsForSkinState(
        userId,
        lastAnalysis?.id || 'routine_temp',
        skinType
      );
    }
    return recommendations;
  }

  private async generateAIRoutine(recommendations: any[], lastAnalysis: SkinAnalysis | null, skinType: string) {
    if (!recommendations.length) return null;
    try {
      return await this.openRouterService.generateRoutineFromRecommendations({
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
    } catch (err: any) {
      this.logger.error(`Erreur lors de la génération de la routine par l'IA: ${err.message}`);
      return null;
    }
  }

  private async initializeRoutines(userId: string) {
    return Promise.all(['AM', 'PM'].map(async (type) => {
      const routine = this.routineRepository.create({ userId, type: type as any, generatedByAI: true });
      return this.routineRepository.save(routine);
    }));
  }

  private async processRoutineSteps(routineId: string, type: 'AM' | 'PM', aiRoutine: any, recommendations: any[], skinType: string) {
    const steps = this.buildSteps(type, aiRoutine, recommendations, skinType);
    const allowFallback = !recommendations.length;

    const resolved = await Promise.all(steps.map(async (s) => {
      const product = (await this.resolveProduct(s.rec)) || (allowFallback ? await this.findFallbackProduct(s.stepName, skinType) : null);
      return product ? this.routineStepRepository.create({
        routineId,
        productId: product.id,
        stepOrder: s.stepOrder,
        notes: s.notes || s.stepName,
      }) : null;
    }));

    await this.routineStepRepository.save(resolved.filter((s): s is RoutineStep => !!s));
  }

  private buildSteps(type: 'AM' | 'PM', aiRoutine: any, recommendations: any[], skinType: string) {
    const fromAi = type === 'AM' ? aiRoutine?.morning : aiRoutine?.night;
    if (Array.isArray(fromAi) && fromAi.length > 0) {
      return fromAi.map((step: any, index: number) => ({
        stepOrder: index + 1,
        stepName: (step?.stepName || 'Serum') as RoutineStepName,
        rec: recommendations.find((r: any) => r?.name === step?.productName),
        notes: [step?.instruction, step?.reason].filter(Boolean).join(' '),
      })).filter(s => s.rec);
    }

    return this.buildDefaultSteps(type, recommendations);
  }

  private buildDefaultSteps(type: 'AM' | 'PM', recommendations: any[]) {
    const filter = (cat: string) => recommendations.filter(p => normalizeType(p?.type).toLowerCase().includes(cat));
    const cleaners = filter('cleanser');
    const serums = filter('serum');
    const moisturizers = filter('moisturiz');

    const pick = (items: any[], n: number) => items[Math.min(n, items.length - 1)] || null;
    const offset = type === 'AM' ? 0 : 1;

    return [
      { stepOrder: 1, stepName: 'Cleanser' as const, rec: pick(cleaners, offset), notes: 'Nettoyer la peau.' },
      { stepOrder: 2, stepName: 'Serum' as const, rec: pick(serums, offset), notes: 'Appliquer avant la creme.' },
      { stepOrder: 3, stepName: 'Moisturizer' as const, rec: pick(moisturizers, offset), notes: 'Sceller l hydratation.' },
    ];
  }

  private async resolveProduct(rec: any): Promise<Product | null> {
    if (!rec) return null;
    const name = normalizeType(rec.name);
    const url = this.normalizeUrl(rec.url);

    let product = rec.id ? await this.productRepository.findOne({ where: { id: rec.id } }) : null;
    if (!product && name) product = await this.productRepository.findOne({ where: { name } });

    if (product && url && (!product.url || product.url === '#' || !product.url.startsWith('http'))) {
      product.url = url;
      await this.productRepository.save(product);
    }
    return product;
  }

  private normalizeUrl(u: unknown): string | null {
    if (typeof u !== 'string' || !u.trim() || u.trim() === '#') return null;
    const trimmed = u.trim();
    if (trimmed.startsWith('http')) return trimmed;
    return `https://${trimmed.replace(/^\/\//, '')}`;
  }

  private async findFallbackProduct(stepName: RoutineStepName, skinType: string): Promise<Product | null> {
    const typeKeyword = stepName === 'Moisturizer' ? 'Moistur' : stepName;
    const skinTypeLower = skinType.toLowerCase();
    
    let product = await this.productRepository.findOne({ where: { skinType: skinTypeLower, type: Like(`%${typeKeyword}%`) } });
    if (!product) product = await this.productRepository.findOne({ where: { type: Like(`%${typeKeyword}%`) } });
    return product;
  }

  private async buildRoutineResponse(amId: string, pmId: string): Promise<RoutineResponseDto> {
    const amDto = await this.buildRoutineDto(amId);
    const pmDto = await this.buildRoutineDto(pmId);
    const productIds = [...amDto, ...pmDto].map(s => s.product.id);
    
    const allProducts = productIds.length ? await this.productRepository.find({ where: { id: In(productIds) } }) : [];
    const checkResult = this.incompatibilityService.checkRoutine(allProducts);

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

