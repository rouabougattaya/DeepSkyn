import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Papa from 'papaparse';
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

    const { exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    const scriptPath = path.join(process.cwd(), 'scripts', 'recommend.py');
    const dataPath = path.join(process.cwd(), 'data', 'skincare_products_clean.csv');

    this.logger.debug(`Paths - Script: ${scriptPath}, Data: ${dataPath}`);
    const pythonPath = process.env.PYTHON_PATH || 'python';

    // On prépare les préoccupations (concerns) comme argument
    const concernsArg = (concerns && concerns.length > 0) ? concerns.join(',') : '';

    // Si on a la dataset réelle, on utilise le script Python
    if (fs.existsSync(dataPath)) {
      this.logger.log(`Dataset trouvée. Exécution de ${scriptPath} avec skinType=${skinType} et concerns=[${concernsArg}]`);
      return new Promise((resolve, reject) => {
        exec(`"${pythonPath}" "${scriptPath}" ${skinType} "${concernsArg}"`, { cwd: process.cwd() }, (error, stdout, stderr) => {
          if (error) {
            const stderrText = String(stderr ?? '');
            this.logger.error(`Erreur EXEC Python: ${error.message} | STDERR: ${stderrText}`);
            if (stderrText.includes('ModuleNotFoundError') && stderrText.toLowerCase().includes('pandas')) {
              this.logger.warn('Python désactivé: dependency pandas manquante. Passage direct au fallback DB.');
              this.pythonDisabled = true;
            }
            this.getDatabaseFallback(userId, analysisId, skinType, concerns).then(resolve).catch(reject);
            return;
          }

          try {
            const results = JSON.parse(stdout);
            if (results.error) {
              const errText = String(results.error);
              this.logger.warn(`Erreur Logique Python: ${errText}`);
              if (errText.toLowerCase().includes('pandas')) {
                this.logger.warn('Python désactivé suite à l erreur (pandas).');
                this.pythonDisabled = true;
              }
              this.getDatabaseFallback(userId, analysisId, skinType, concerns).then(resolve);
            } else {
              this.logger.log(`✅ ${results.length} recommandations générées via Python.`);
              resolve(results);
            }
          } catch (e: any) {
            this.logger.error(`Erreur Parsing STDOUt: ${stdout} | Erreur: ${e?.message || e}`);
            this.getDatabaseFallback(userId, analysisId, skinType, concerns).then(resolve);
          }
        });
      });
    } else {
      this.logger.warn(`Dataset NON trouvée à ${dataPath}`);
    }

    // Sinon, on garde le comportement actuel (Database Fallback)
    return this.getDatabaseFallback(userId, analysisId, skinType, concerns);
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
    const mappedType = skinType.toLowerCase();
    const normalizedConcerns = concerns.map((c) => String(c || '').toLowerCase()).filter(Boolean);

    // Try 1: Find products with matching skinType
    let matchedProducts = await this.productRepository.find({
      where: { skinType: mappedType },
      take: 20,
    });

    // Try 2: If no products found, get popular products without skinType filter
    if (matchedProducts.length === 0) {
      this.logger.warn(`No products found for skinType '${mappedType}', falling back to top-rated products`);
      matchedProducts = await this.productRepository.find({
        order: { rating: 'DESC' },
        take: 20,
      });
    }

    // Try 3: If still no products, get any available products
    if (matchedProducts.length === 0) {
      this.logger.warn('No products available in database');
      matchedProducts = await this.productRepository.find({ take: 20 });
    }

    const normalizeUrl = (u: unknown): string | null => {
      if (typeof u !== 'string') return null;
      const trimmed = u.trim();
      if (!trimmed || trimmed === '#') return null;
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('//')) return `https:${trimmed}`;
      return `https://${trimmed}`;
    };

    const scoredProducts = matchedProducts
      .map((p) => {
        const productConcerns = ((p as any).targetIssues || [])
          .map((issue: string) => String(issue || '').toLowerCase());
        const concernOverlap = normalizedConcerns.filter((c) => productConcerns.includes(c)).length;
        const ratingScore = typeof (p as any).rating === 'number' ? Number((p as any).rating) : 0;
        return {
          p,
          score: concernOverlap * 3 + ratingScore,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Group by basic categories to ensure routine variety
    const categorized = {
      cleanser: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('cleanser')),
      serum: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('serum')),
      moisturizer: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('moisturizer')),
      sunscreen: scoredProducts.filter(item => (item.p.type || '').toLowerCase().includes('sunscreen')),
      other: scoredProducts.filter(item =>
        !['cleanser', 'serum', 'moisturizer', 'sunscreen'].some(cat => (item.p.type || '').toLowerCase().includes(cat))
      )
    };

    const finalSelection: any[] = [];
    const usedIds = new Set<string>();

    const pickRandomFromTop = (list: any[], count: number = 1, topN: number = 3) => {
      if (!list.length) return;
      const pool = list.slice(0, topN);
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const item = pool.splice(idx, 1)[0];
        if (!usedIds.has(item.p.id)) {
          finalSelection.push(item);
          usedIds.add(item.p.id);
        }
      }
    };

    // Pick 1 from each main category
    pickRandomFromTop(categorized.cleanser);
    pickRandomFromTop(categorized.serum);
    pickRandomFromTop(categorized.moisturizer);
    pickRandomFromTop(categorized.sunscreen);

    // Fill the rest (up to 6) from "other" or remaining top scored
    const remainingPool = scoredProducts.filter(item => !usedIds.has(item.p.id));
    pickRandomFromTop(remainingPool, 6 - finalSelection.length, 10);

    const valid = finalSelection
      .map(({ p }) => {
        const url = normalizeUrl((p as any).url);
        if (!url) return null;

        // Generate a reason
        const type = (p.type || 'Skincare').toLowerCase();
        let reason = "Recommandé pour votre routine quotidienne.";
        if (type.includes('cleanser')) reason = "Nettoyant doux pour purifier sans agresser.";
        if (type.includes('serum')) reason = "Sérum concentré pour traiter vos préoccupations ciblées.";
        if (type.includes('moisturizer')) reason = "Hydratant essentiel pour protéger votre barrière cutanée.";
        if (type.includes('sunscreen')) reason = "Protection solaire indispensable pour prévenir le vieillissement.";

        return {
          ...p,
          url,
          reason
        };
      })
      .filter(Boolean);

    return valid;
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
    const { readFileSync, existsSync } = require('fs');
    const path = require('path');

    const dataPath = path.join(process.cwd(), 'data', 'skincare_products_clean.csv');
    if (!existsSync(dataPath)) {
      this.logger.warn(`seedProducts: dataset introuvable à ${dataPath}`);
      return;
    }

    const count = await this.productRepository.count();

    // Si la DB est presque vide ou si certains produits n'ont pas d'URL,
    // on recharge depuis le CSV pour garantir les liens "Acheter".
    const missingUrlCount = await this.productRepository
      .createQueryBuilder('p')
      .where('p.url IS NULL OR p.url = :empty OR p.url = :hash', { empty: '', hash: '#' })
      .getCount();

    if (count > 50 && missingUrlCount === 0) return;

    this.logger.log('Seed produits: chargement du dataset CSV...');

    const csvText = readFileSync(dataPath, 'utf8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    const rows = (parsed.data as any[]).filter(Boolean);
    const csvByName = new Map<string, any>();

    for (const r of rows) {
      const name = String(r.product_name ?? '').trim();
      if (!name) continue;
      csvByName.set(name, r);
    }

    // 1) Update des produits existants dont l'URL est manquante / invalide
    if (missingUrlCount > 0) {
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
        p.cluster = p.cluster ?? Math.floor(Math.random() * 5);
        updated.push(p);
      }

      if (updated.length) {
        await this.productRepository.save(updated);
        this.logger.log(`Seed produits: mise à jour ${updated.length} produits sans URL.`);
      }
    }

    // 2) Insertion des produits manquants si la DB est trop petite
    const shouldInsertMore = count < 50;
    if (!shouldInsertMore) return;

    const existing = await this.productRepository.find({ select: ['name'] as any });
    const existingNames = new Set(existing.map((p) => p.name));

    const toInsert: Product[] = [];
    for (const r of rows) {
      const name = String(r.product_name ?? '').trim();
      if (!name) continue;
      if (existingNames.has(name)) continue;

      const url = String(r.product_url ?? '').trim();
      const type = String(r.product_type ?? '').trim();
      const ingredients = String(r.clean_ingreds ?? '').trim();
      const priceRaw = String(r.price ?? '').trim();
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));

      if (!url || !type || !ingredients || !Number.isFinite(price)) continue;

      const product = this.productRepository.create({
        name,
        type,
        url,
        ingredients: ingredients.split(',').map((s) => s.trim()).filter(Boolean),
        price,
        skinType: this.inferSkinTypeFromIngredients(ingredients),
        cluster: Math.floor(Math.random() * 5),
      });

      toInsert.push(product);
    }

    if (toInsert.length) {
      await this.productRepository.save(toInsert);
      this.logger.log(`Seed produits: insertion de ${toInsert.length} produits depuis CSV.`);
    }
  }
}
