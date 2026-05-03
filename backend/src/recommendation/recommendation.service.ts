import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as Papa from 'papaparse';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Product } from '../products/entities/product.entity';
import { Recommendation } from './recommendation.entity';
import { RecommendationItem } from '../recommendationItem/recommendation-item.entity';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private pythonDisabled = false;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationItem)
    private readonly itemRepository: Repository<RecommendationItem>,
  ) { }

  /**
   * Implémentation du moteur de recommandation basé sur le modèle Python et la DATASET réelle
   */
  async getRecommendationsForSkinState(
    userId: string,
    analysisId: string,
    skinType: string,
    concerns: string[] = [],
  ): Promise<any[]> {
    this.logger.log(`Génération de recommandations pour userId=${userId}, type=${skinType} (via Dataset Python)`);

    if (this.pythonDisabled) {
      return this.getDatabaseFallback(userId, analysisId, skinType, concerns);
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'recommend.py');
    const dataPath = path.join(process.cwd(), 'data', 'skincare_products_clean.csv');
    this.logger.debug(`Paths - Script: ${scriptPath}, Data: ${dataPath}`);

    if (fs.existsSync(dataPath)) {
      this.logger.log(`Dataset trouvée. Exécution de ${scriptPath} via spawn`);
      return this.runPythonRecommendation(scriptPath, dataPath, userId, analysisId, skinType, concerns);
    }

    this.logger.warn(`Dataset NON trouvée à ${dataPath}`);
    return this.getDatabaseFallback(userId, analysisId, skinType, concerns);
  }

  private runPythonRecommendation(
    scriptPath: string,
    dataPath: string,
    userId: string,
    analysisId: string,
    skinType: string,
    concerns: string[],
  ): Promise<any[]> {
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const concernsArg = concerns.length > 0 ? concerns.join(',') : '';
    return new Promise((resolve, reject) => {
      const pyProcess = spawn(pythonPath, [scriptPath, skinType, concernsArg], { cwd: process.cwd() });
      let stdout = '';
      let stderr = '';

      pyProcess.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      pyProcess.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      pyProcess.on('close', (code: number) =>
        this.handlePythonClose(code, stdout, stderr, userId, analysisId, skinType, concerns, resolve, reject)
      );
    });
  }

  private handlePythonClose(
    code: number,
    stdout: string,
    stderr: string,
    userId: string,
    analysisId: string,
    skinType: string,
    concerns: string[],
    resolve: (v: any[]) => void,
    reject: (e: any) => void,
  ): void {
    if (code !== 0) {
      this.logger.error(`Python process exited with code ${code} | STDERR: ${stderr}`);
      if (stderr.includes('ModuleNotFoundError') && stderr.toLowerCase().includes('pandas')) {
        this.pythonDisabled = true;
      }
      this.getDatabaseFallback(userId, analysisId, skinType, concerns).then(resolve).catch(reject);
      return;
    }
    try {
      const results = JSON.parse(stdout);
      if (results.error) {
        this.logger.warn(`Erreur Logique Python: ${results.error}`);
        this.getDatabaseFallback(userId, analysisId, skinType, concerns).then(resolve);
      } else {
        this.logger.log(`✅ ${results.length} recommandations générées via Python.`);
        resolve(results);
      }
    } catch (e: any) {
      this.logger.error(`Erreur Parsing STDOUT: ${stdout.slice(0, 100)}... | Erreur: ${e.message}`);
      this.getDatabaseFallback(userId, analysisId, skinType, concerns).then(resolve);
    }
  }

  async saveFinalRecommendations(
    userId: string,
    analysisId: string,
    recommendations: Array<any>,
    explanation?: string,
    aiConfidenceScore?: number,
  ): Promise<void> {
    if (!userId || !analysisId || !recommendations?.length) {
      return;
    }

    const recommendation = await this.recommendationRepository.save({
      userId,
      analysisId,
      explanation: explanation ?? null,
      aiConfidenceScore: typeof aiConfidenceScore === 'number' ? aiConfidenceScore : null,
    } as Recommendation);

    const itemEntities: RecommendationItem[] = [];
    for (let index = 0; index < recommendations.length; index++) {
      const rec = recommendations[index];
      const productId = await this.resolveProductId(rec);
      if (!productId) continue;

      itemEntities.push(
        this.itemRepository.create({
          recommendationId: recommendation.id,
          productId,
          ranking: index + 1,
          reason: typeof rec?.reason === 'string' ? rec.reason : null,
        }),
      );
    }

    if (itemEntities.length > 0) {
      await this.itemRepository.save(itemEntities);
    }
  }

  async getRecommendationsForAnalysis(analysisId: string): Promise<any[]> {
    if (!analysisId) return [];

    const recommendation = await this.recommendationRepository.findOne({
      where: { analysisId },
      order: { generatedAt: 'DESC' },
    });

    return this.getRecommendationsFromRecord(recommendation);
  }

  async getLatestFinalRecommendationsForUser(userId: string): Promise<any[]> {
    if (!userId) return [];

    const latest = await this.recommendationRepository.findOne({
      where: { userId },
      order: { generatedAt: 'DESC' },
    });

    return this.getRecommendationsFromRecord(latest);
  }

  /**
   * Helper shared par getRecommendationsForAnalysis et getLatestFinalRecommendationsForUser
   */
  private async getRecommendationsFromRecord(recommendation: Recommendation | null): Promise<any[]> {
    if (!recommendation) return [];

    const items = await this.itemRepository.find({
      where: { recommendationId: recommendation.id },
      order: { ranking: 'ASC' },
    });

    if (!items.length) return [];

    const products = await this.productRepository.find({
      where: { id: In(items.map((i) => i.productId)) },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    return items
      .map((item) => {
        const product = productById.get(item.productId);
        if (!product) return null;
        return {
          ...product,
          reason: item.reason ?? undefined,
          ranking: item.ranking,
          recommendationId: recommendation.id,
          analysisId: recommendation.analysisId,
        };
      })
      .filter(Boolean);
  }


  /**
   * Fallback base de données (si dataset absente ou erreur)
   */
  private async getDatabaseFallback(userId: string, analysisId: string, skinType: string, concerns: string[] = []): Promise<any[]> {
    const matchedProducts = await this.getMatchedProducts(skinType);
    const scoredProducts = this.scoreProducts(matchedProducts, concerns);
    const finalSelection = this.selectDiverseProducts(scoredProducts);

    return finalSelection.map((item) => this.formatRecommendation(item.p));
  }

  private async getMatchedProducts(skinType: string): Promise<Product[]> {
    const mappedType = skinType.toLowerCase();
    let products = await this.productRepository.find({ where: { skinType: mappedType }, take: 20 });
    
    if (products.length === 0) {
      this.logger.warn(`No products found for skinType '${mappedType}', falling back to top-rated products`);
      products = await this.productRepository.find({ order: { rating: 'DESC' }, take: 20 });
    }
    
    if (products.length === 0) {
      this.logger.warn('No products available in database');
      products = await this.productRepository.find({ take: 20 });
    }
    
    return products;
  }

  private scoreProducts(products: Product[], concerns: string[]) {
    const normalizedConcerns = concerns.map((c) => String(c || '').toLowerCase()).filter(Boolean);
    return products
      .map((p) => {
        const productConcerns = ((p as any).targetIssues || []).map((issue: string) => String(issue || '').toLowerCase());
        const concernOverlap = normalizedConcerns.filter((c) => productConcerns.includes(c)).length;
        const ratingScore = typeof (p as any).rating === 'number' ? Number((p as any).rating) : 0;
        return { p, score: concernOverlap * 3 + ratingScore };
      })
      .sort((a, b) => b.score - a.score);
  }

  private selectDiverseProducts(scoredProducts: any[]) {
    const categorized = {
      cleanser: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('cleanser')),
      serum: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('serum')),
      moisturizer: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('moisturizer')),
      sunscreen: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('sunscreen')),
      other: scoredProducts.filter(item => !['cleanser', 'serum', 'moisturizer', 'sunscreen'].some(cat => (item.p.type || '').toLowerCase().includes(cat)))
    };

    const finalSelection: any[] = [];
    const usedIds = new Set<string>();

    const pick = (list: any[], count: number = 1) => {
      const pool = list.slice(0, 3);
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = crypto.randomInt(0, pool.length);
        const item = pool.splice(idx, 1)[0];
        if (!usedIds.has(item.p.id)) {
          finalSelection.push(item);
          usedIds.add(item.p.id);
        }
      }
    };

    pick(categorized.cleanser);
    pick(categorized.serum);
    pick(categorized.moisturizer);
    pick(categorized.sunscreen);

    const remaining = scoredProducts.filter(item => !usedIds.has(item.p.id));
    pick(remaining, 6 - finalSelection.length);

    return finalSelection;
  }

  private formatRecommendation(p: Product) {
    const type = (p.type || 'Skincare').toLowerCase();
    let reason = "Recommandé pour votre routine quotidienne.";
    if (type.includes('cleanser')) reason = "Nettoyant doux pour purifier sans agresser.";
    else if (type.includes('serum')) reason = "Sérum concentré pour traiter vos préoccupations ciblées.";
    else if (type.includes('moisturizer')) reason = "Hydratant essentiel pour protéger votre barrière cutanée.";
    else if (type.includes('sunscreen')) reason = "Protection solaire indispensable pour prévenir le vieillissement.";

    return { ...p, url: this.normalizeUrl((p as any).url), reason };
  }

  private normalizeUrl(u: unknown): string | null {
    if (typeof u !== 'string') return null;
    const trimmed = u.trim();
    if (!trimmed || trimmed === '#') return null;
    if (trimmed.startsWith('http')) return trimmed;
    return `https://${trimmed.replace(/^\/\//, '')}`;
  }

  private async resolveProductId(rec: any): Promise<string | null> {
    if (typeof rec?.id === 'string' && rec.id.trim()) {
      return rec.id;
    }

    const name = typeof rec?.name === 'string' ? rec.name.trim() : '';
    if (!name) return null;

    const byName = await this.productRepository.findOne({ where: { name } });
    return byName?.id ?? null;
  }

  /**
   * Logique d'inférence du type de peau depuis les ingrédients (Portage du modèle Python)
   */
  inferSkinTypeFromIngredients(ingredients: string): string {
    const dryKeywords = ['butyrospermum', 'beurre', 'ceramide', 'glycerin', 'phytosphingosine', 'shorea', 'borago'];
    const oilyKeywords = ['capric triglyceride', 'dimethicone', 'polydecene', 'cetearyl ethylhexanoate', 'non-comedogenic'];
    const sensitiveKeywords = ['allantoin', 'pelargonium', 'chamomilla', 'calendula', 'panthenol', 'niacinamide', 'asiaticoside'];

    const ingredsLower = ingredients.toLowerCase();
    let dryCount = 0;
    dryKeywords.forEach(k => { if (ingredsLower.includes(k)) dryCount++; });

    let oilyCount = 0;
    oilyKeywords.forEach(k => { if (ingredsLower.includes(k)) oilyCount++; });

    let sensitiveCount = 0;
    sensitiveKeywords.forEach(k => { if (ingredsLower.includes(k)) sensitiveCount++; });

    const max = Math.max(dryCount, oilyCount, sensitiveCount);
    if (max === 0) return 'normal';
    if (dryCount === max) return 'dry';
    if (oilyCount === max) return 'oily';
    return 'sensitive';
  }

  /**
   * Initialisation de la base de produits (Seeder partiel)
   */
  async seedProducts() {
    const dataPath = path.join(process.cwd(), 'data', 'skincare_products_clean.csv');
    if (!fs.existsSync(dataPath)) {
      this.logger.warn(`seedProducts: dataset introuvable à ${dataPath}`);
      return;
    }

    const count = await this.productRepository.count();
    const missingUrlCount = await this.productRepository
      .createQueryBuilder('p')
      .where('p.url IS NULL OR p.url = :empty OR p.url = :hash', { empty: '', hash: '#' })
      .getCount();

    if (count > 50 && missingUrlCount === 0) return;

    this.logger.log('Seed produits: chargement du dataset CSV...');
    const csvText = fs.readFileSync(dataPath, 'utf8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = (parsed.data as any[]).filter(Boolean);
    const csvByName = new Map<string, any>();
    for (const r of rows) {
      const name = String(r.product_name ?? '').trim();
      if (name) csvByName.set(name, r);
    }

    if (missingUrlCount > 0) {
      await this.updateMissingUrls(csvByName);
    }

    if (count < 50) {
      await this.insertNewProducts(rows, csvByName);
    }
  }

  private async updateMissingUrls(csvByName: Map<string, any>): Promise<void> {
    const missing = await this.productRepository
      .createQueryBuilder('p')
      .where('p.url IS NULL OR p.url = :empty OR p.url = :hash', { empty: '', hash: '#' })
      .getMany();
    const updated: Product[] = [];

    for (const p of missing) {
      const r = csvByName.get(p.name);
      if (!r) continue;

      let url = String(r.product_url ?? '').trim();
      const type = String(r.product_type ?? '').trim();
      const ingredients = String(r.clean_ingreds ?? '').trim();
      const priceRaw = String(r.price ?? '').trim();
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));

      if (!url || !type || !ingredients || !Number.isFinite(price)) continue;

      if (!url.startsWith('http://') && !url.startsWith('https://') && url.startsWith('www.')) {
        url = `https://${url}`;
      }

      p.url = url;
      p.type = type;
      p.ingredients = ingredients.split(',').map((s) => s.trim()).filter(Boolean);
      p.price = price;
      p.skinType = this.inferSkinTypeFromIngredients(ingredients);
      p.cluster = p.cluster ?? crypto.randomInt(0, 5);
      updated.push(p);
    }

    if (updated.length) {
      await this.productRepository.save(updated);
      this.logger.log(`Seed produits: mise à jour ${updated.length} produits sans URL.`);
    }
  }

  private async insertNewProducts(rows: any[], csvByName: Map<string, any>): Promise<void> {
    const existing = await this.productRepository.find({ select: ['name'] as any });
    const existingNames = new Set(existing.map((p) => p.name));
    const toInsert: Product[] = [];

    for (const r of rows) {
      const name = String(r.product_name ?? '').trim();
      if (!name || existingNames.has(name)) continue;

      const url = String(r.product_url ?? '').trim();
      const type = String(r.product_type ?? '').trim();
      const ingredients = String(r.clean_ingreds ?? '').trim();
      const priceRaw = String(r.price ?? '').trim();
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));

      if (!url || !type || !ingredients || !Number.isFinite(price)) continue;

      toInsert.push(this.productRepository.create({
        name,
        type,
        url,
        ingredients: ingredients.split(',').map((s) => s.trim()).filter(Boolean),
        price,
        skinType: this.inferSkinTypeFromIngredients(ingredients),
        cluster: crypto.randomInt(0, 5),
      }));
    }

    if (toInsert.length) {
      await this.productRepository.save(toInsert);
      this.logger.log(`Seed produits: insertion de ${toInsert.length} produits depuis CSV.`);
    }
  }
}
