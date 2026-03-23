import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Recommendation } from './recommendation.entity';
import { RecommendationItem } from '../recommendationItem/recommendation-item.entity';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

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
            this.logger.error(`Erreur EXEC Python: ${error.message} | STDERR: ${stderr}`);
            this.getDatabaseFallback(userId, analysisId, skinType).then(resolve).catch(reject);
            return;
          }
          
          try {
            const results = JSON.parse(stdout);
            if (results.error) {
              this.logger.warn(`Erreur Logique Python: ${results.error}`);
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
    const matchedProducts = await this.productRepository.find({
      where: { skinType: mappedType },
      take: 5,
    });
    // ... la suite de la logique de sauvegarde recommendationId ...
    return matchedProducts;
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

    const counts = { dry: dryCount, oily: oilyCount, sensitive: sensitiveCount };
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Initialisation de la base de produits (Seeder partiel)
   */
  async seedProducts() {
    const count = await this.productRepository.count();
    if (count > 0) return;

    this.logger.log('Peuplement de la base de données produits (Skincare Seed)...');

    const sampleProducts = [
      {
        name: 'The Ordinary Natural Moisturising Factors + HA',
        type: 'Moisturiser',
        ingredients: 'capric triglyceride, cetyl alcohol, propanediol, stearyl alcohol, glycerin, sodium hyaluronate',
        price: 5.2,
      },
      {
        name: 'CeraVe Facial Moisturising Lotion SPF 25',
        type: 'Moisturiser',
        ingredients: 'homosalate, glycerin, octocrylene, ethylhexyl salicylate, niacinamide, ceramide np, ceramide ap, ceramide eop, phytosphingosine',
        price: 13.0,
      },
      {
        name: 'The Ordinary Hyaluronic Acid 2% + B5',
        type: 'Serum',
        ingredients: 'sodium hyaluronate, sodium hyaluronate crosspolymer, panthenol, glycerin',
        price: 6.2,
      },
      {
        name: 'CeraVe Foaming Facial Cleanser',
        type: 'Cleanser',
        ingredients: 'glycerin, niacinamide, ceramide np, ceramide ap, ceramide eop, phytosphingosine, hyaluronic acid',
        price: 10.5,
      },
      {
        name: 'La Roche-Posay Effaclar Mat',
        type: 'Moisturiser',
        ingredients: 'dimethicone, salicylic acid, non-comedogenic, silica, zin pca',
        price: 18.5,
      }
    ];

    for (const p of sampleProducts) {
      const skinType = this.inferSkinTypeFromIngredients(p.ingredients);
      const product = this.productRepository.create({
        ...p,
        skinType,
        cluster: Math.floor(Math.random() * 5),
      });
      await this.productRepository.save(product);
    }
  }
}
