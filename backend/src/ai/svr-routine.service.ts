import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import * as fs from 'fs';
import * as path from 'path';

export type SvrSkinType = 'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal';
export type SvrCategory = 'cleanser' | 'toner' | 'serum' | 'moisturizer' | 'sunscreen' | 'eye-cream' | 'mask' | 'exfoliant' | 'treatment';

export interface SvrProduct {
  id: string;
  name: string;
  category: SvrCategory;
  suitableSkinTypes: SvrSkinType[];
  suitableConcerns: string[];
  ingredients: string[];
  description: string;
  price: number;
  url: string;
  imageUrl?: string;
  ageGroup?: 'young' | 'mature' | 'all';
  texture?: string;
  score?: number; // dermatologist recommendation score /10
}

export interface SvrRecommendedProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  url: string;
  imageUrl?: string;
  keyIngredients: string[];
  reason: string;       // why this product for THIS skin profile
  skinBenefit: string;  // short benefit claim
  texture?: string;
  score: number;        // 0-10
}

export interface SvrRoutineStep {
  stepOrder: number;
  stepName: string;
  product: {
    name: string;
    category: string;
    description: string;
    price: number;
    url: string;
    imageUrl?: string;
    keyIngredients: string[];
  };
  instruction: string;
  reason: string;
}

export interface SvrRoutineResult {
  recommendedProducts: SvrRecommendedProduct[];
  morning: SvrRoutineStep[];
  night: SvrRoutineStep[];
  skinProfile: string;
  generalAdvice: string;
}

/* ══════════════════════════════════════════════════════════════════
   EXPANDED SVR CATALOG — 32 products, multiple per category
   ══════════════════════════════════════════════════════════════════ */
const SVR_CATALOG: SvrProduct[] = [

  // ═══ CLEANSERS / GELS ══════════════════════════════════════════
  {
    id: 'svr-c01',
    name: 'SVR Sebiaclear Gel Moussant',
    category: 'cleanser',
    suitableSkinTypes: ['Oily', 'Combination'],
    suitableConcerns: ['acne', 'blackheads', 'pores', 'oiliness'],
    ingredients: ['Zinc PCA', 'Niacinamide', 'Salicylic Acid'],
    description: 'Gel nettoyant purifiant anti-imperfections qui régule le sébum sans assécher.',
    price: 12.50, url: 'https://www.svr.com/en/sebiaclear-gel-moussant', ageGroup: 'all', texture: 'gel', score: 9.2,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-Gel-Moussant-1004C17-SVR-Purifiezeteliminezlesimperfections.jpg?v=1733157597',
  },
  {
    id: 'svr-c02',
    name: 'SVR Sensifine Gel Nettoyant',
    category: 'cleanser',
    suitableSkinTypes: ['Sensitive', 'Dry', 'Normal'],
    suitableConcerns: ['redness', 'sensitivity', 'dryness', 'irritation'],
    ingredients: ['Niacinamide', 'Acide Hyaluronique', 'Eau Thermale'],
    description: 'Gel nettoyant ultra-doux pour peaux sensibles et intolérantes. Apaise les rougeurs.',
    price: 11.90, url: 'https://www.svr.com/en/sensifine-gel-nettoyant', ageGroup: 'all', texture: 'gel doux', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/products/sensifine-gel-nettoyant_2021_2000x2000_17498c0d-6e9f-43f1-b0f3-808c1d293d20.jpg?v=1657725732',
  },
  {
    id: 'svr-c03',
    name: 'SVR Hydraliane Crème Lavante',
    category: 'cleanser',
    suitableSkinTypes: ['Dry', 'Sensitive', 'Normal'],
    suitableConcerns: ['dryness', 'hydration', 'sensitivity', 'tightness'],
    ingredients: ['Acide Hyaluronique', 'Glycérine', 'Céramides'],
    description: "Crème lavante riche qui préserve la barrière naturelle de la peau tout en nettoyant.",
    price: 13.00, url: 'https://www.svr.com/en/hydraliane-creme-lavante', ageGroup: 'all', texture: 'crème lavante', score: 8.8,
    imageUrl: 'https://fr.svr.com/cdn/shop/files/HYDRALIANE_Creme_Lavante_200ml_Recto.jpg?v=1710344534',
  },
  {
    id: 'svr-c04',
    name: 'SVR [Ac]² Mousse Nettoyante',
    category: 'cleanser',
    suitableSkinTypes: ['Oily', 'Combination', 'Normal'],
    suitableConcerns: ['acne', 'blackheads', 'pores', 'scars'],
    ingredients: ['Acide Salicylique 0.5%', 'Rétinol', 'Niacinamide'],
    description: 'Mousse nettoyante anti-acné qui désincruste les pores et prévient les boutons.',
    price: 14.50, url: 'https://www.svr.com/en/ac2-mousse-nettoyante', ageGroup: 'all', texture: 'mousse', score: 9.1,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-Mousse-Nettoyante-1004C17-SVR-Purifiezeteliminezlesimperfections.jpg?v=1733157597',
  },
  {
    id: 'svr-c05',
    name: 'SVR Topialyse Gel Nettoyant',
    category: 'cleanser',
    suitableSkinTypes: ['Dry', 'Sensitive'],
    suitableConcerns: ['dryness', 'eczema', 'sensitivity', 'irritation'],
    ingredients: ['Niacinamide', 'Huile de Tournesol', 'Glycérine'],
    description: 'Gel surgras pour peaux sèches et atopiques. Nettoie sans agresser ni dessécher.',
    price: 10.90, url: 'https://www.svr.com/en/topialyse-gel-nettoyant', ageGroup: 'all', texture: 'gel surgras', score: 8.6,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/TOPIALYSE_Gel_Nettoyant_200ml_Recto.jpg?v=1710344534',
  },
  {
    id: 'svr-c06',
    name: 'SVR Densitium Crème Nettoyante',
    category: 'cleanser',
    suitableSkinTypes: ['Dry', 'Normal', 'Sensitive'],
    suitableConcerns: ['wrinkles', 'dryness', 'hydration'],
    ingredients: ['Phytosphingosine', 'Huile de Rose Musquée', 'Vitamine E'],
    description: 'Crème nettoyante anti-âge qui nettoie tout en luttant contre les signes du vieillissement.',
    price: 16.90, url: 'https://www.svr.com/en/densitium-creme-nettoyante', ageGroup: 'mature', texture: 'crème', score: 8.5,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/DENSITIUM_Creme_Nettoyante_200ml_Recto.jpg?v=1710344534',
  },

  // ═══ SERUMS ════════════════════════════════════════════════════
  {
    id: 'svr-s01',
    name: 'SVR [B3] Sérum Concentré Pores',
    category: 'serum',
    suitableSkinTypes: ['Oily', 'Combination', 'Normal'],
    suitableConcerns: ['pores', 'blackheads', 'oiliness', 'acne'],
    ingredients: ['Niacinamide 4%', 'Zinc PCA', 'Acide Hyaluronique'],
    description: 'Sérum niacinamide 4% qui resserre visiblement les pores et régule le sébum.',
    price: 19.90, url: 'https://www.svr.com/en/b3-serum-concentre-pores', ageGroup: 'all', texture: 'sérum fluide', score: 9.4,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-B3-AmpouleHydra-1002316-SVR-Hydratezetapaisezvotrepeauaveccetteampoulealniacinedereference.jpg?v=1733158444',
  },
  {
    id: 'svr-s02',
    name: 'SVR [Ac]² Sérum Réparateur',
    category: 'serum',
    suitableSkinTypes: ['Oily', 'Combination', 'Sensitive'],
    suitableConcerns: ['acne', 'scars', 'dark-spots', 'redness'],
    ingredients: ['Acide Salicylique', 'Rétinol', 'Centella Asiatica'],
    description: 'Sérum correcteur qui cible les boutons actifs, estompe les cicatrices et prévient les rechutes.',
    price: 22.50, url: 'https://www.svr.com/en/ac2-serum-reparateur', ageGroup: 'all', texture: 'sérum', score: 9.2,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-Serum-1004A16-SVR-Concentrepurifiantanti-imperfections.jpg?v=1733159175',
  },
  {
    id: 'svr-s03',
    name: 'SVR Ampoule [Redness] Sérum Correcteur',
    category: 'serum',
    suitableSkinTypes: ['Sensitive', 'Normal', 'Combination'],
    suitableConcerns: ['redness', 'sensitivity', 'dark-spots', 'uneven-tone'],
    ingredients: ['Vitamine C', 'Niacinamide', 'Extraits Probiotiques'],
    description: 'Corrige les rougeurs, unifie le teint et renforce la barrière cutanée avec des actifs apaisants.',
    price: 21.90, url: 'https://www.svr.com/en/ampoule-redness', ageGroup: 'all', texture: 'sérum fluide', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/products/ampouleA_2021_2000x2000_12356c0d-6e9f-43f1-b0f3-808c1d293d20.jpg?v=1657725732',
  },
  {
    id: 'svr-s04',
    name: 'SVR Ampoule [Hydra] Sérum Plumping',
    category: 'serum',
    suitableSkinTypes: ['Dry', 'Sensitive', 'Normal', 'Combination'],
    suitableConcerns: ['hydration', 'dryness', 'wrinkles', 'plumping'],
    ingredients: ['Acide Hyaluronique 3%', 'Céramides', 'Glycérine'],
    description: "Sérum de comblement à triple poids d'acide hyaluronique pour hydrater intensément toutes les couches.",
    price: 23.90, url: 'https://www.svr.com/en/ampoule-hydra', ageGroup: 'all', texture: 'sérum aqueux', score: 9.3,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-B3-AmpouleHydra-1002316-SVR-Hydratezetapaisezvotrepeauaveccetteampoulealniacinedereference.jpg?v=1733158444',
  },
  {
    id: 'svr-s05',
    name: 'SVR Densitium Sérum Anti-Âge',
    category: 'serum',
    suitableSkinTypes: ['Dry', 'Normal', 'Combination', 'Sensitive'],
    suitableConcerns: ['wrinkles', 'sagging', 'dark-spots', 'hydration'],
    ingredients: ['Phytosphingosine', 'Peptides', 'Rétinol 0.5%'],
    description: 'Sérum anti-âge qui raffermit, lisse les rides et restaure la densité de la peau.',
    price: 32.90, url: 'https://www.svr.com/en/densitium-serum', ageGroup: 'mature', texture: 'sérum riche', score: 9.1,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Densitium-Bi-Serum-1020416-SVR-Redensifiezetrepulpezvotrepeauavecceserumdoubleaction.jpg?v=1733324772',
  },
  {
    id: 'svr-s06',
    name: 'SVR [B3] Ampoule Éclat',
    category: 'serum',
    suitableSkinTypes: ['Normal', 'Combination', 'Oily'],
    suitableConcerns: ['dark-spots', 'uneven-tone', 'dull-skin', 'pores'],
    ingredients: ['Niacinamide 5%', 'Vitamine C', 'Acide Azélaïque'],
    description: 'Ampoule éclat qui efface les taches, illumine le teint terne et resserre les pores visibles.',
    price: 25.90, url: 'https://www.svr.com/en/b3-ampoule-eclat', ageGroup: 'all', texture: 'ampoule', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-B3-AmpouleHydra-1002316-SVR-Hydratezetapaisezvotrepeauaveccetteampoulealniacinedereference.jpg?v=1733158444',
  },

  // ═══ MOISTURIZERS / CRÈMES ═════════════════════════════════════
  {
    id: 'svr-m01',
    name: 'SVR Sebiaclear Mat Hydra',
    category: 'moisturizer',
    suitableSkinTypes: ['Oily', 'Combination'],
    suitableConcerns: ['oiliness', 'acne', 'pores', 'blackheads'],
    ingredients: ['Niacinamide', 'Zinc', 'Acide Hyaluronique'],
    description: "Hydratant matifiant anti-boutons. Contrôle l'excès de sébum tout en hydratant confortablement.",
    price: 16.90, url: 'https://www.svr.com/en/sebiaclear-mat-hydra', ageGroup: 'all', texture: 'gel-crème', score: 9.3,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-ActiveGel-1004C16-SVR-Soincompletanti-imperfections.jpg?v=1733159024',
  },
  {
    id: 'svr-m02',
    name: 'SVR Sensifine Crème Riche',
    category: 'moisturizer',
    suitableSkinTypes: ['Sensitive', 'Dry'],
    suitableConcerns: ['redness', 'sensitivity', 'dryness', 'hydration', 'irritation'],
    ingredients: ['Beurre de Karité', 'Niacinamide', 'Vitamine E'],
    description: 'Crème riche apaisante pour peaux très sensibles et intolérantes. Réduit les poussées réactives.',
    price: 17.50, url: 'https://www.svr.com/en/sensifine-creme-riche', ageGroup: 'all', texture: 'crème riche', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/products/sensifine-creme_2021_2000x2000_36527492-01e6-4511-bfbb-77d6ee58d537.jpg?v=1657725732',
  },
  {
    id: 'svr-m03',
    name: 'SVR Hydraliane Légère',
    category: 'moisturizer',
    suitableSkinTypes: ['Normal', 'Combination', 'Oily'],
    suitableConcerns: ['hydration', 'dryness', 'freshness'],
    ingredients: ['Acide Hyaluronique', 'Aquaxyl', 'Eau Thermale'],
    description: 'Crème légère longue durée. Hydratation sans lourdeur ni brillance toute la journée.',
    price: 15.90, url: 'https://www.svr.com/en/hydraliane-legere', ageGroup: 'all', texture: 'crème légère', score: 9.1,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Hydraliane-Creme-1012C16-SVR-Hydratationintenseetdurable.jpg?v=1733159424',
  },
  {
    id: 'svr-m04',
    name: 'SVR Hydraliane Riche',
    category: 'moisturizer',
    suitableSkinTypes: ['Dry', 'Sensitive'],
    suitableConcerns: ['dryness', 'hydration', 'tightness', 'sensitivity'],
    ingredients: ['Acide Hyaluronique', 'Beurre de Karité', 'Urée'],
    description: 'Crème riche réparatrice pour les peaux très sèches et tiraillées. Restaure le confort en 1h.',
    price: 17.90, url: 'https://www.svr.com/en/hydraliane-riche', ageGroup: 'all', texture: 'crème riche', score: 8.9,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Hydraliane-Riche-1012D16-SVR-Soinnourrissantpourpeauxseches.jpg?v=1733529324',
  },
  {
    id: 'svr-m05',
    name: 'SVR Densitium Crème Légère',
    category: 'moisturizer',
    suitableSkinTypes: ['Normal', 'Combination', 'Sensitive'],
    suitableConcerns: ['wrinkles', 'dark-spots', 'hydration', 'sagging'],
    ingredients: ['Phytosphingosine', 'Peptides', 'Acide Hyaluronique'],
    description: "Crème anti-âge légère. Raffermit, réduit les rides et restaure l'éclat pour la peau 45+.",
    price: 28.90, url: 'https://www.svr.com/en/densitium-creme-legere', ageGroup: 'mature', texture: 'crème', score: 9.2,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Densitium-Creme-1020316-SVR-Soinanti-ageglobalpourvotrevisage.jpg?v=1733159518',
  },
  {
    id: 'svr-m06',
    name: 'SVR Densitium Riche',
    category: 'moisturizer',
    suitableSkinTypes: ['Dry', 'Sensitive'],
    suitableConcerns: ['wrinkles', 'dryness', 'hydration', 'sagging'],
    ingredients: ['Phytosphingosine', 'Céramides', 'Beurre de Karité'],
    description: 'Crème anti-âge riche pour peau sèche mature. Nourrit et réduit les signes du vieillissement.',
    price: 29.90, url: 'https://www.svr.com/en/densitium-riche', ageGroup: 'mature', texture: 'crème riche', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Densitium-CremeRiche-1020C16-SVR-Soinfermeteetdensitepeauxseches.jpg?v=1733159512',
  },
  {
    id: 'svr-m07',
    name: 'SVR Topialyse Crème',
    category: 'moisturizer',
    suitableSkinTypes: ['Dry', 'Sensitive'],
    suitableConcerns: ['eczema', 'dryness', 'irritation', 'sensitivity'],
    ingredients: ['Niacinamide', 'Huile de Tournesol', 'Glycérine 5%'],
    description: 'Baume émollient pour peaux sèches à atopiques. Restaure le film hydrolipidique.',
    price: 13.90, url: 'https://www.svr.com/en/topialyse-creme', ageGroup: 'all', texture: 'baume crème', score: 8.7,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Topialyse-Creme-1014V16-SVR-Hydratezetapaisezvotrepeauseche.jpg?v=1733159269',
  },

  // ═══ SUNSCREENS ════════════════════════════════════════════════
  {
    id: 'svr-sp01',
    name: 'SVR Sun Secure Blur SPF50+',
    category: 'sunscreen',
    suitableSkinTypes: ['Normal', 'Combination', 'Oily', 'Sensitive'],
    suitableConcerns: ['oiliness', 'dark-spots', 'wrinkles', 'pores'],
    ingredients: ['Filtres UV SPF50+', 'Niacinamide', 'Silice'],
    description: 'SPF50+ invisible à finish mat et effet flouteur. Sans film blanc, léger toute la journée.',
    price: 17.90, url: 'https://www.svr.com/en/sun-secure-blur', ageGroup: 'all', texture: 'fluide mat', score: 9.5,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sun-Secure-Blur-SPF50-1011O16-SVR-ProtectionSolaireHauteEfficacite.jpg?v=1733158498',
  },
  {
    id: 'svr-sp02',
    name: 'SVR Sun Secure Crème SPF50+',
    category: 'sunscreen',
    suitableSkinTypes: ['Dry', 'Sensitive'],
    suitableConcerns: ['dryness', 'wrinkles', 'sensitivity'],
    ingredients: ['Filtres UV SPF50+', 'Acide Hyaluronique', 'Glycérine'],
    description: 'Crème solaire hydratante SPF50+ pour peau sèche et sensible. Protège et hydrate.',
    price: 16.90, url: 'https://www.svr.com/en/sun-secure-creme', ageGroup: 'all', texture: 'crème', score: 9.2,
    imageUrl: 'https://fr.svr.com/cdn/shop/files/SUN_SECURE_Creme_SPF50_50ml_Recto.jpg?v=1710344534',
  },
  {
    id: 'svr-sp03',
    name: 'SVR Sun Secure Spray SPF50+ Invisible',
    category: 'sunscreen',
    suitableSkinTypes: ['Normal', 'Oily', 'Combination'],
    suitableConcerns: ['oiliness', 'pores', 'reapplication'],
    ingredients: ['Filtres UV SPF50+', 'Alcool SD', 'Silice'],
    description: 'Spray solaire invisible ultra-léger. Parfait pour la réapplication sur maquillage.',
    price: 18.50, url: 'https://www.svr.com/en/sun-secure-spray', ageGroup: 'all', texture: 'spray', score: 8.8,
    imageUrl: 'https://fr.svr.com/cdn/shop/files/SUN_SECURE_Spray_SPF50_200ml_Recto.jpg?v=1710344534',
  },
  {
    id: 'svr-sp04',
    name: 'SVR Sun Secure Huile Sèche SPF30',
    category: 'sunscreen',
    suitableSkinTypes: ['Dry', 'Normal'],
    suitableConcerns: ['dryness', 'hydration'],
    ingredients: ['Filtres UV SPF30', 'Huile de Jojoba', 'Vitamine E'],
    description: 'Huile sèche solaire SPF30 qui nourrit et protège. Finition dorée et soyeuse.',
    price: 15.90, url: 'https://www.svr.com/en/sun-secure-huile', ageGroup: 'all', texture: 'huile sèche', score: 8.6,
    imageUrl: 'https://fr.svr.com/cdn/shop/files/SUN_SECURE_Huile_SPF50_200ml_Recto.jpg?v=1710344534',
  },

  // ═══ TONERS ════════════════════════════════════════════════════
  {
    id: 'svr-t01',
    name: 'SVR [B3] Lotion Équilibrante',
    category: 'toner',
    suitableSkinTypes: ['Oily', 'Combination'],
    suitableConcerns: ['pores', 'oiliness', 'blackheads', 'acne'],
    ingredients: ['Niacinamide 2%', 'Zinc PCA', 'Hamamélis'],
    description: "Lotion équilibrante qui resserre les pores, réduit l'excès de sébum et prépare la peau au sérum.",
    price: 13.90, url: 'https://www.svr.com/en/b3-lotion', ageGroup: 'all', texture: 'lotion', score: 8.9,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-Micro-Peel-1004E16-SVR-Lotiondesincrustanteetpurifiante.jpg?v=1733159024',
  },
  {
    id: 'svr-t02',
    name: 'SVR Hydraliane Lotion',
    category: 'toner',
    suitableSkinTypes: ['Dry', 'Normal', 'Sensitive'],
    suitableConcerns: ['dryness', 'hydration', 'sensitivity'],
    ingredients: ['Acide Hyaluronique', 'Eau de Rose', 'Glycérine'],
    description: "Essence hydratante qui booste l'absorption d'humidité et prépare la peau à la routine.",
    price: 12.90, url: 'https://www.svr.com/en/hydraliane-lotion', ageGroup: 'all', texture: 'essence', score: 8.7,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Hydraliane-Essence-1012B16-SVR-Essencehydratanteetrepulpante.jpg?v=1733159424',
  },

  // ═══ EXFOLIANTS ════════════════════════════════════════════════
  {
    id: 'svr-e01',
    name: 'SVR Sebiaclear Micro-Peeling',
    category: 'exfoliant',
    suitableSkinTypes: ['Oily', 'Combination', 'Normal'],
    suitableConcerns: ['blackheads', 'pores', 'acne', 'dark-spots', 'texture'],
    ingredients: ['Acide Salicylique 2%', 'Acide Glycolique', 'Acide Lactique'],
    description: 'Micro-peeling BHA/AHA qui désincruste les pores, lisse la texture et estompe les marques de boutons.',
    price: 18.50, url: 'https://www.svr.com/en/sebiaclear-micro-peeling', ageGroup: 'all', texture: 'sérum exfoliant', score: 9.1,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-Micro-Peel-1004E16-SVR-Lotiondesincrustanteetpurifiante.jpg?v=1733159024',
  },
  {
    id: 'svr-e02',
    name: 'SVR [B3] Gommage Raffinant',
    category: 'exfoliant',
    suitableSkinTypes: ['Normal', 'Combination'],
    suitableConcerns: ['pores', 'texture', 'dull-skin'],
    ingredients: ['Niacinamide 3%', 'Billes de Rice', 'Acide Mandélique'],
    description: 'Gommage doux qui resserre les pores et affine le grain de peau sans irriter.',
    price: 16.90, url: 'https://www.svr.com/en/b3-gommage', ageGroup: 'all', texture: 'gommage', score: 8.7,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-B3-MasqueGommage-1002416-SVR-Affinezvotrevisualaveccemasquegommage.jpg?v=1733159074',
  },

  // ═══ MASKS ═════════════════════════════════════════════════════
  {
    id: 'svr-ma01',
    name: 'SVR Sensifine Masque SOS',
    category: 'mask',
    suitableSkinTypes: ['Sensitive', 'Dry', 'Normal'],
    suitableConcerns: ['redness', 'sensitivity', 'dryness', 'irritation'],
    ingredients: ['Calendula', 'Panthénol', 'Eau Thermale'],
    description: "Masque SOS apaisant. Calme l'irritation et réduit les rougeurs en 10 minutes.",
    price: 15.90, url: 'https://www.svr.com/en/sensifine-masque', ageGroup: 'all', texture: 'masque crème', score: 8.8,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sensifine-Masque-1002A16-SVR-Apaisementimmédiatpourvoptrepeau.jpg?v=1733159115',
  },
  {
    id: 'svr-ma02',
    name: 'SVR Sebiaclear Masque Purifiant',
    category: 'mask',
    suitableSkinTypes: ['Oily', 'Combination'],
    suitableConcerns: ['acne', 'blackheads', 'pores', 'oiliness'],
    ingredients: ['Argile Kaolin', 'Acide Salicylique', 'Zinc'],
    description: "Masque purifiant à l'argile qui désincruste les pores et absorbe l'excès de sébum.",
    price: 14.90, url: 'https://www.svr.com/en/sebiaclear-masque', ageGroup: 'all', texture: 'masque argile', score: 8.9,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-Masque-1004D16-SVR-Nettoyageenprofondeurpourpeauxgrasses.jpg?v=1733221234',
  },

  // ═══ EYE TREATMENTS ════════════════════════════════════════════
  {
    id: 'svr-ey01',
    name: 'SVR Ampoule Relax Sérum Regard',
    category: 'eye-cream',
    suitableSkinTypes: ['Dry', 'Sensitive', 'Normal', 'Combination', 'Oily'],
    suitableConcerns: ['wrinkles', 'dark-spots', 'fatigue', 'puffiness'],
    ingredients: ['Caféine', 'Peptides', 'Acide Hyaluronique'],
    description: 'Sérum contour des yeux qui dégonfle, atténue les cernes et lisse les rides d\'expression.',
    price: 24.90, url: 'https://www.svr.com/en/ampoule-relax-serum-regard', ageGroup: 'mature', texture: 'sérum', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Ampoule-Relax-1002E16-SVR-Regarddefatigueetpluslumineux.jpg?v=1733159114',
  },

  // ═══ TARGETED TREATMENTS ═══════════════════════════════════════
  {
    id: 'svr-tr01',
    name: 'SVR [Ac]² Crème Régulatrice',
    category: 'treatment',
    suitableSkinTypes: ['Oily', 'Combination'],
    suitableConcerns: ['acne', 'oiliness', 'pores', 'scars'],
    ingredients: ['Rétinol 0.1%', 'Acide Salicylique 0.5%', 'Niacinamide'],
    description: 'Crème régulatrice ciblée pour traiter les formes légères à modérées d\'acné et prévenir les récidives.',
    price: 20.90, url: 'https://www.svr.com/en/ac2-creme-regulatrice', ageGroup: 'all', texture: 'crème', score: 9.2,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-ActiveGel-1004C16-SVR-Soincompletanti-imperfections.jpg?v=1733159024',
  },
  {
    id: 'svr-tr02',
    name: 'SVR Sebiaclear Active Pimple Patches',
    category: 'treatment',
    suitableSkinTypes: ['Oily', 'Combination', 'Normal'],
    suitableConcerns: ['acne', 'blackheads', 'scars'],
    ingredients: ['Hydrocolloid', 'Acide Salicylique', 'Tea Tree'],
    description: 'Patchs anti-boutons à action rapide. Réduit l\'inflammation et accélère la cicatrisation en 8h.',
    price: 9.90, url: 'https://www.svr.com/en/sebiaclear-patches', ageGroup: 'all', texture: 'patch', score: 9.0,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0256/9021/0376/files/1.1-Sebiaclear-ActiveGel-1004C16-SVR-Soincompletanti-imperfections.jpg?v=1733159024',
  },
];

@Injectable()
export class SvrRoutineService {
  private readonly logger = new Logger(SvrRoutineService.name);
  private scrapedCatalogCache: SvrProduct[] | null = null;

  constructor(private readonly openRouterService: OpenRouterService) {}

  async generateRoutine(profile: any): Promise<SvrRoutineResult> {
    this.logger.log(`🧴 Generating personalized SVR recommendations for ${profile.skinType} skin`);

    const uniqueConcerns = this.deriveConcerns(profile);
    const catalog = this.getMergedCatalog();
    const finalPool = this.buildPersonalizedPool(catalog, profile, uniqueConcerns);

    try {
      return await this.openRouterService.generateSVRRoutine(finalPool, { ...profile, concerns: uniqueConcerns });
    } catch (error: any) {
      this.logger.error('❌ LLM failed, using fallback');
      return this.buildFallbackResult(finalPool, profile.skinType);
    }
  }

  private buildFallbackResult(products: SvrProduct[], skinType: string): SvrRoutineResult {
    const findByCat = (cat: SvrCategory) => products.filter(p => p.category === cat).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const [cleanser] = findByCat('cleanser');
    const [serum1] = findByCat('serum');
    const [moisturizer] = findByCat('moisturizer');
    const [sunscreen] = findByCat('sunscreen');

    const toRecommended = (p: SvrProduct, reason: string): SvrRecommendedProduct => ({
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      url: p.url,
      imageUrl: p.imageUrl,
      keyIngredients: p.ingredients,
      reason,
      skinBenefit: p.suitableConcerns.slice(0, 2).join(' · '),
      texture: p.texture,
      score: p.score ?? 8.5,
    });

    const toStep = (order: number, stepName: string, p: SvrProduct, instruction: string, reason: string): SvrRoutineStep => ({
      stepOrder: order,
      stepName,
      product: { name: p.name, category: p.category, description: p.description, price: p.price, url: p.url, imageUrl: p.imageUrl, keyIngredients: p.ingredients },
      instruction,
      reason,
    });

    return {
      recommendedProducts: [cleanser, serum1, moisturizer, sunscreen].filter(Boolean).map(p => toRecommended(p!, 'Adapté')),
      morning: [
        toStep(1, 'Nettoyage', cleanser!, "Appliquer sur peau humide.", 'Nettoyage doux.'),
        toStep(2, 'Sérum', serum1!, 'Appliquer 3 gouttes.', 'Traitement.'),
        toStep(3, 'Hydratant', moisturizer!, "Appliquer.", 'Hydratation.'),
        toStep(4, 'SPF', sunscreen!, "Appliquer.", 'Protection.'),
      ],
      night: [
        toStep(1, 'Nettoyage', cleanser!, 'Appliquer.', 'Nettoyage.'),
        toStep(2, 'Sérum', serum1!, 'Appliquer.', 'Traitement.'),
        toStep(3, 'Hydratant', moisturizer!, 'Appliquer.', 'Hydratation.'),
      ],
      skinProfile: `Peau ${skinType}`,
      generalAdvice: 'La régularité est clé.',
    };
  }

  private getMergedCatalog(): SvrProduct[] {
    const scraped = this.getScrapedCatalog();
    const merged = new Map<string, SvrProduct>();
    [...SVR_CATALOG, ...scraped].forEach(p => {
      const key = p.name.trim().toLowerCase();
      if (!merged.has(key) || (p.score ?? 0) > (merged.get(key)!.score ?? 0)) merged.set(key, p);
    });
    return Array.from(merged.values());
  }

  private getScrapedCatalog(): SvrProduct[] {
    if (this.scrapedCatalogCache) return this.scrapedCatalogCache;
    try {
      const jsonPath = path.join(process.cwd(), 'data', 'svr_products.json');
      if (!fs.existsSync(jsonPath)) return [];
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      this.scrapedCatalogCache = Array.isArray(data) ? data.map((item, idx) => this.mapScrapedToSvrProduct(item, idx)).filter(Boolean) as SvrProduct[] : [];
      return this.scrapedCatalogCache;
    } catch { return []; }
  }

  private mapScrapedToSvrProduct(item: any, idx: number): SvrProduct | null {
    if (!item?.name || !item?.url) return null;
    return {
      id: `svr-scraped-${idx + 1}`,
      name: item.name.trim(),
      category: this.inferCategoryFromText(`${item.name} ${item.description}`),
      suitableSkinTypes: this.inferSkinTypesFromText(`${item.name} ${item.description}`),
      suitableConcerns: this.normalizeScrapedConcerns(item.target_concerns),
      ingredients: [],
      description: item.description || 'Produit SVR',
      price: 15.0,
      url: item.url.trim(),
      imageUrl: item.image,
      ageGroup: this.inferAgeGroupFromText(`${item.name} ${item.description}`),
      texture: this.inferTextureFromText(`${item.name} ${item.description}`),
      score: 7.8,
    };
  }


  private normalizeScrapedConcerns(input: unknown): string[] {
    const map: Record<string, string[]> = {
      'ACNE': ['acne', 'blackheads', 'pores'],
      'ROUGEURS': ['redness', 'sensitivity'],
      'RIDES': ['wrinkles'],
      'TACHES': ['dark-spots', 'uneven-tone'],
      'HYDRATATION': ['hydration', 'dryness'],
      'PEAU SECHE': ['dryness', 'hydration'],
      'SECHERESSE': ['dryness', 'hydration'],
    };

    if (!Array.isArray(input)) return [];

    const normalized: string[] = [];
    for (const raw of input) {
      const key = String(raw ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
      const mapped = map[key];
      if (mapped?.length) {
        normalized.push(...mapped);
      }
    }
    return [...new Set(normalized)];
  }

  private inferCategoryFromText(text: string): SvrProduct['category'] {
    const t = text.toLowerCase();
    if (/(gel moussant|nettoyant|eau micellaire|demaquillant|lavant)/.test(t)) return 'cleanser';
    if (/(lotion|essence|tonique)/.test(t)) return 'toner';
    if (/(serum|sérum|ampoule|biotic)/.test(t)) return 'serum';
    if (/(spf|sun secure|solaire|ecran mineral|écran minéral|blur)/.test(t)) return 'sunscreen';
    if (/(contour des yeux|eye|regard|palpebral|palpébral)/.test(t)) return 'eye-cream';
    if (/(masque|mask)/.test(t)) return 'mask';
    if (/(peel|gommage|micro-peel|exfol)/.test(t)) return 'exfoliant';
    if (/(creme|crème|baume|hydra|fluide|gel-?creme|gel-?crème)/.test(t)) return 'moisturizer';
    return 'treatment';
  }

  private deriveConcerns(profile: any): string[] {
    const derivedConcerns: string[] = [...(profile.concerns || [])];
    if ((profile.acneLevel ?? 0) > 50) derivedConcerns.push('acne');
    if ((profile.blackheadsLevel ?? 0) > 50) derivedConcerns.push('blackheads');
    if ((profile.poreSize ?? 0) > 50) derivedConcerns.push('pores');
    if ((profile.wrinklesDepth ?? 0) > 50) derivedConcerns.push('wrinkles');
    if ((profile.hydrationLevel ?? 100) < 50) derivedConcerns.push('dryness', 'hydration');
    if ((profile.rednessLevel ?? 0) > 50) derivedConcerns.push('redness', 'sensitivity');
    if ((profile.sensitivityLevel ?? 0) > 60) derivedConcerns.push('sensitivity', 'irritation');
    return [...new Set(derivedConcerns.map(c => c.toLowerCase()))];
  }

  private inferSkinTypesFromText(text: string): Array<'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal'> {
    const t = text.toLowerCase();
    const types = new Set<'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal'>();
    if (/(acne|imperfection|mixte|grasse|pores|sebiaclear|mat)/.test(t)) {
      types.add('Oily');
      types.add('Combination');
    }
    if (/(sensitive|sensifine|reactive|rougeur|intolerante|intolérante)/.test(t)) types.add('Sensitive');
    if (/(dry|seche|sèche|atop|topialyse|hydra|nourrissant)/.test(t)) types.add('Dry');
    if (types.size === 0) {
      types.add('Normal');
      types.add('Combination');
    }
    if (types.size === 1 && types.has('Dry')) types.add('Sensitive');
    return Array.from(types);
  }

  private inferAgeGroupFromText(text: string): 'young' | 'mature' | 'all' {
    const t = text.toLowerCase();
    if (/(anti-age|anti âge|anti-âge|rides|densitium|fermete|fermete|mature)/.test(t)) return 'mature';
    return 'all';
  }

  private inferTextureFromText(text: string): string | undefined {
    const t = text.toLowerCase();
    if (t.includes('gel')) return 'gel';
    if (t.includes('crème') || t.includes('creme')) return 'crème';
    if (t.includes('serum') || t.includes('sérum')) return 'sérum';
    if (t.includes('huile')) return 'huile';
    if (t.includes('spray') || t.includes('brume')) return 'spray';
    if (t.includes('lotion')) return 'lotion';
    return undefined;
  }

  getDebugProducts(): SvrProduct[] {
    return this.getMergedCatalog().slice(0, 10);
  }

  private buildPersonalizedPool(
    catalog: SvrProduct[],
    profile: any,
    uniqueConcerns: string[],
  ): SvrProduct[] {
    const concernBoosts = this.getConcernBoosts(profile);
    const scored = this.scoreCatalog(catalog, profile, uniqueConcerns, concernBoosts);
    
    return this.selectProductsFromScored(scored);
  }

  private getConcernBoosts(profile: any): Record<string, number> {
    const boosts: Record<string, number> = {};
    if ((profile.acneLevel ?? 0) > 50) boosts.acne = 2;
    if ((profile.blackheadsLevel ?? 0) > 50) boosts.blackheads = 1.5;
    if ((profile.poreSize ?? 0) > 50) boosts.pores = 1.5;
    if ((profile.wrinklesDepth ?? 0) > 50) boosts.wrinkles = 2;
    if ((profile.hydrationLevel ?? 100) < 50) {
      boosts.hydration = 2;
      boosts.dryness = 2;
    }
    if ((profile.rednessLevel ?? 0) > 50 || (profile.sensitivityLevel ?? 0) > 60) {
      boosts.redness = 2;
      boosts.sensitivity = 2;
      boosts.irritation = 1.5;
    }
    return boosts;
  }

  private scoreCatalog(catalog: SvrProduct[], profile: any, uniqueConcerns: string[], concernBoosts: Record<string, number>) {
    return catalog
      .filter((p) => this.isAgeAppropriate(p, profile.age))
      .map((p) => {
        const skinMatch = p.suitableSkinTypes.includes(profile.skinType as any) ? 3 : 0;
        const concerns = p.suitableConcerns.map((c) => c.toLowerCase());
        const overlap = concerns.filter((c) => uniqueConcerns.includes(c)).length;
        const overlapScore = overlap * 2;
        const boosted = concerns.reduce((sum, c) => sum + (concernBoosts[c] ?? 0), 0);
        const base = p.score ?? 7;
        const finalScore = base + skinMatch + overlapScore + boosted;
        return { product: p, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  private isAgeAppropriate(product: SvrProduct, age: number): boolean {
    if (!product.ageGroup || product.ageGroup === 'all') return true;
    return (product.ageGroup === 'mature' && age >= 40) || (product.ageGroup === 'young' && age < 40);
  }

  private selectProductsFromScored(scored: Array<{ product: SvrProduct; finalScore: number }>): SvrProduct[] {
    const selected: SvrProduct[] = [];
    const used = new Set<string>();
    const perCategoryCount = new Map<string, number>();

    const mustHave: SvrCategory[] = ['cleanser', 'serum', 'moisturizer', 'sunscreen'];

    for (const cat of mustHave) {
      const candidate = scored.find((s) => s.product.category === cat && !used.has(s.product.name));
      if (candidate) {
        this.addProductToSelection(candidate.product, selected, used, perCategoryCount);
      }
    }

    for (const entry of scored) {
      if (selected.length >= 18) break;
      const p = entry.product;
      if (used.has(p.name) || (perCategoryCount.get(p.category) ?? 0) >= 3) continue;
      this.addProductToSelection(p, selected, used, perCategoryCount);
    }

    return selected;
  }

  private addProductToSelection(p: SvrProduct, selected: SvrProduct[], used: Set<string>, perCategoryCount: Map<string, number>) {
    selected.push(p);
    used.add(p.name);
    perCategoryCount.set(p.category, (perCategoryCount.get(p.category) ?? 0) + 1);
  }

}
