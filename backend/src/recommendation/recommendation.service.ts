import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Papa from 'papaparse';
import { Product } from './product.entity';
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
  ) {}

  /**
   * Implémentation du moteur de recommandation basé sur le modèle Python et la DATASET réelle
   */
  async getRecommendationsForSkinState(userId: string, analysisId: string, skinType: string): Promise<any[]> {
    this.logger.log(`Génération de recommandations pour userId=${userId}, type=${skinType} (via Dataset Python)`);

    if (this.pythonDisabled) {
      return this.getDatabaseFallback(userId, analysisId, skinType);
    }

    const { exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'recommend.py');
    const dataPath = path.join(process.cwd(), 'data', 'skincare_products_clean.csv');

    this.logger.debug(`Paths - Script: ${scriptPath}, Data: ${dataPath}`);

    const pythonPath = 'C:\\Python313\\python.exe';

    // Si on a la dataset réelle, on utilise le script Python
    if (fs.existsSync(dataPath)) {
      this.logger.log(`Dataset trouvée. Exécution de ${scriptPath}`);
      return new Promise((resolve, reject) => {
        exec(`"${pythonPath}" "${scriptPath}" ${skinType}`, { cwd: process.cwd() }, (error, stdout, stderr) => {
          if (error) {
            const stderrText = String(stderr ?? '');
            this.logger.error(`Erreur EXEC Python: ${error.message} | STDERR: ${stderrText}`);
            if (stderrText.includes('ModuleNotFoundError') && stderrText.toLowerCase().includes('pandas')) {
              this.logger.warn('Python désactivé: dependency pandas manquante. Passage direct au fallback DB.');
              this.pythonDisabled = true;
            }
            this.getDatabaseFallback(userId, analysisId, skinType).then(resolve).catch(reject);
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
              this.getDatabaseFallback(userId, analysisId, skinType).then(resolve);
            } else {
              this.logger.log(`✅ ${results.length} recommandations générées via Python.`);
              resolve(results);
            }
          } catch (e) {
            this.logger.error(`Erreur Parsing STDOUt: ${stdout} | Erreur: ${e.message}`);
            this.getDatabaseFallback(userId, analysisId, skinType).then(resolve);
          }
        });
      });
    } else {
      this.logger.warn(`Dataset NON trouvée à ${dataPath}`);
    }

    // Sinon, on garde le comportement actuel (Database Fallback)
    return this.getDatabaseFallback(userId, analysisId, skinType);
  }

  /**
   * Fallback base de données (si dataset absente ou erreur)
   */
  private async getDatabaseFallback(userId: string, analysisId: string, skinType: string): Promise<any[]> {
    const mappedType = skinType.toLowerCase();
    // On over-fetch, puis on filtre pour ne garder que des URLs valides.
    const matchedProducts = await this.productRepository.find({
      where: { skinType: mappedType },
      take: 20,
    });

    const normalizeUrl = (u: unknown): string | null => {
      if (typeof u !== 'string') return null;
      const trimmed = u.trim();
      if (!trimmed || trimmed === '#') return null;
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('//')) return `https:${trimmed}`;
      return `https://${trimmed}`;
    };

    const valid = matchedProducts
      .map((p) => {
        const url = normalizeUrl((p as any).url);
        return { p, url };
      })
      .filter(({ url }) => !!url)
      .slice(0, 5)
      .map(({ p, url }) => ({
        ...p,
        url,
      }));

    // ... la suite de la logique de sauvegarde recommendationId ...
    return valid;
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
        p.ingredients = ingredients;
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
        ingredients,
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
