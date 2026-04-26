
const { Client } = require('pg');

const SVR_CATALOG = [
  { name: 'SVR Sebiaclear Gel Moussant', category: 'Cleanser', concerns: ['acne', 'blackheads', 'pores', 'oiliness'], ingredients: ['Zinc PCA', 'Niacinamide', 'Salicylic Acid'], description: 'Gel nettoyant purifiant anti-imperfections qui régule le sébum sans assécher.', price: 12.50, url: 'https://www.svr.com/en/sebiaclear-gel-moussant' },
  { name: 'SVR Sensifine Gel Nettoyant', category: 'Cleanser', concerns: ['redness', 'sensitivity', 'dryness', 'irritation'], ingredients: ['Niacinamide', 'Acide Hyaluronique', 'Eau Thermale'], description: 'Gel nettoyant ultra-doux pour peaux sensibles et intolérantes. Apaise les rougeurs.', price: 11.90, url: 'https://www.svr.com/en/sensifine-gel-nettoyant' },
  { name: 'SVR Hydraliane Crème Lavante', category: 'Cleanser', concerns: ['dryness', 'hydration', 'sensitivity', 'tightness'], ingredients: ['Acide Hyaluronique', 'Glycérine', 'Céramides'], description: "Crème lavante riche qui préserve la barrière naturelle de la peau tout en nettoyant.", price: 13.00, url: 'https://www.svr.com/en/hydraliane-creme-lavante' },
  { name: 'SVR [Ac]² Mousse Nettoyante', category: 'Cleanser', concerns: ['acne', 'blackheads', 'pores', 'scars'], ingredients: ['Acide Salicylique 0.5%', 'Rétinol', 'Niacinamide'], description: 'Mousse nettoyante anti-acné qui désincruste les pores et prévient les boutons.', price: 14.50, url: 'https://www.svr.com/en/ac2-mousse-nettoyante' },
  { name: 'SVR Topialyse Gel Nettoyant', category: 'Cleanser', concerns: ['dryness', 'eczema', 'sensitivity', 'irritation'], ingredients: ['Niacinamide', 'Huile de Tournesol', 'Glycérine'], description: 'Gel surgras pour peaux sèches et atopiques. Nettoie sans agresser ni dessécher.', price: 10.90, url: 'https://www.svr.com/en/topialyse-gel-nettoyant' },
  { name: 'SVR Densitium Crème Nettoyante', category: 'Cleanser', concerns: ['wrinkles', 'dryness', 'hydration'], ingredients: ['Phytosphingosine', 'Huile de Rose Musquée', 'Vitamine E'], description: 'Crème nettoyante anti-âge qui nettoie tout en luttant contre les signes du vieillissement.', price: 16.90, url: 'https://www.svr.com/en/densitium-creme-nettoyante' },
  { name: 'SVR [B3] Sérum Concentré Pores', category: 'Serum', concerns: ['pores', 'blackheads', 'oiliness', 'acne'], ingredients: ['Niacinamide 4%', 'Zinc PCA', 'Acide Hyaluronique'], description: 'Sérum niacinamide 4% qui resserre visiblement les pores et régule le sébum.', price: 19.90, url: 'https://www.svr.com/en/b3-serum-concentre-pores' },
  { name: 'SVR [Ac]² Sérum Réparateur', category: 'Serum', concerns: ['acne', 'scars', 'dark-spots', 'redness'], ingredients: ['Acide Salicylique', 'Rétinol', 'Centella Asiatica'], description: 'Sérum correcteur qui cible les boutons actifs, estompe les cicatrices et prévient les rechutes.', price: 22.50, url: 'https://www.svr.com/en/ac2-serum-reparateur' },
  { name: 'SVR Ampoule [Redness] Sérum Correcteur', category: 'Serum', concerns: ['redness', 'sensitivity', 'dark-spots', 'uneven-tone'], ingredients: ['Vitamine C', 'Niacinamide', 'Extraits Probiotiques'], description: 'Corrige les rougeurs, unifie le teint et renforce la barrière cutanée avec des actifs apaisants.', price: 21.90, url: 'https://www.svr.com/en/ampoule-redness' },
  { name: 'SVR Ampoule [Hydra] Sérum Plumping', category: 'Serum', concerns: ['hydration', 'dryness', 'wrinkles', 'plumping'], ingredients: ['Acide Hyaluronique 3%', 'Céramides', 'Glycérine'], description: "Sérum de comblement à triple poids d'acide hyaluronique pour hydrater intensément toutes les couches.", price: 23.90, url: 'https://www.svr.com/en/ampoule-hydra' },
  { name: 'SVR Densitium Sérum Anti-Âge', category: 'Serum', concerns: ['wrinkles', 'sagging', 'dark-spots', 'hydration'], ingredients: ['Phytosphingosine', 'Peptides', 'Rétinol 0.5%'], description: 'Sérum anti-âge qui raffermit, lisse les rides et restaure la densité de la peau.', price: 32.90, url: 'https://www.svr.com/en/densitium-serum' },
  { name: 'SVR [B3] Ampoule Éclat', category: 'Serum', concerns: ['dark-spots', 'uneven-tone', 'dull-skin', 'pores'], ingredients: ['Niacinamide 5%', 'Vitamine C', 'Acide Azélaïque'], description: 'Ampoule éclat qui efface les taches, illumine le teint terne et resserre les pores visibles.', price: 25.90, url: 'https://www.svr.com/en/b3-ampoule-eclat' },
  { name: 'SVR Sebiaclear Mat Hydra', category: 'Moisturiser', concerns: ['oiliness', 'acne', 'pores', 'blackheads'], ingredients: ['Niacinamide', 'Zinc', 'Acide Hyaluronique'], description: "Hydratant matifiant anti-boutons. Contrôle l'excès de sébum tout en hydratant confortablement.", price: 16.90, url: 'https://www.svr.com/en/sebiaclear-mat-hydra' },
  { name: 'SVR Sensifine Crème Riche', category: 'Moisturiser', concerns: ['redness', 'sensitivity', 'dryness', 'hydration', 'irritation'], ingredients: ['Beurre de Karité', 'Niacinamide', 'Vitamine E'], description: 'Crème riche apaisante pour peaux très sensibles et intolérantes. Réduit les poussées réactives.', price: 17.50, url: 'https://www.svr.com/en/sensifine-creme-riche' },
  { name: 'SVR Hydraliane Légère', category: 'Moisturiser', concerns: ['hydration', 'dryness', 'freshness'], ingredients: ['Acide Hyaluronique', 'Aquaxyl', 'Eau Thermale'], description: 'Crème légère longue durée. Hydratation sans lourdeur ni brillance toute la journée.', price: 15.90, url: 'https://www.svr.com/en/hydraliane-legere' },
  { name: 'SVR Hydraliane Riche', category: 'Moisturiser', concerns: ['dryness', 'hydration', 'tightness', 'sensitivity'], ingredients: ['Acide Hyaluronique', 'Beurre de Karité', 'Urée'], description: 'Crème riche réparatrice pour les peaux très sèches et tiraillées. Restaure le confort en 1h.', price: 17.90, url: 'https://www.svr.com/en/hydraliane-riche' },
  { name: 'SVR Densitium Crème Légère', category: 'Moisturiser', concerns: ['wrinkles', 'dark-spots', 'hydration', 'sagging'], ingredients: ['Phytosphingosine', 'Peptides', 'Acide Hyaluronique'], description: "Crème anti-âge légère. Raffermit, réduit les rides et restaure l'éclat pour la peau 45+.", price: 28.90, url: 'https://www.svr.com/en/densitium-creme-legere' },
  { name: 'SVR Densitium Riche', category: 'Moisturiser', concerns: ['wrinkles', 'dryness', 'hydration', 'sagging'], ingredients: ['Phytosphingosine', 'Céramides', 'Beurre de Karité'], description: 'Crème anti-âge riche pour peau sèche mature. Nourrit et réduit les signes du vieillissement.', price: 29.90, url: 'https://www.svr.com/en/densitium-riche' },
  { name: 'SVR Topialyse Crème', category: 'Moisturiser', concerns: ['eczema', 'dryness', 'irritation', 'sensitivity'], ingredients: ['Niacinamide', 'Huile de Tournesol', 'Glycérine 5%'], description: 'Baume émollient pour peaux sèches à atopiques. Restaure le film hydrolipidique.', price: 13.90, url: 'https://www.svr.com/en/topialyse-creme' },
  { name: 'SVR Sun Secure Blur SPF50+', category: 'Sunscreen', concerns: ['oiliness', 'dark-spots', 'wrinkles', 'pores'], ingredients: ['Filtres UV SPF50+', 'Niacinamide', 'Silice'], description: 'SPF50+ invisible à finish mat et effet flouteur. Sans film blanc, léger toute la journée.', price: 17.90, url: 'https://www.svr.com/en/sun-secure-blur' },
  { name: 'SVR Sun Secure Crème SPF50+', category: 'Sunscreen', concerns: ['dryness', 'wrinkles', 'sensitivity'], ingredients: ['Filtres UV SPF50+', 'Acide Hyaluronique', 'Glycérine'], description: 'Crème solaire hydratante SPF50+ pour peau sèche et sensible. Protège et hydrate.', price: 16.90, url: 'https://www.svr.com/en/sun-secure-creme' },
  { name: 'SVR Sun Secure Spray SPF50+ Invisible', category: 'Sunscreen', concerns: ['oiliness', 'pores', 'reapplication'], ingredients: ['Filtres UV SPF50+', 'Alcool SD', 'Silice'], description: 'Spray solaire invisible ultra-léger. Parfait pour la réapplication sur maquillage.', price: 18.50, url: 'https://www.svr.com/en/sun-secure-spray' },
  { name: 'SVR [B3] Lotion Équilibrante', category: 'Toner', concerns: ['pores', 'oiliness', 'blackheads', 'acne'], ingredients: ['Niacinamide 2%', 'Zinc PCA', 'Hamamélis'], description: "Lotion équilibrante qui resserre les pores, réduit l'excès de sébum et prépare la peau au sérum.", price: 13.90, url: 'https://www.svr.com/en/b3-lotion' },
  { name: 'SVR Sebiaclear Micro-Peeling', category: 'Exfoliant', concerns: ['blackheads', 'pores', 'acne', 'dark-spots', 'texture'], ingredients: ['Acide Salicylique 2%', 'Acide Glycolique', 'Acide Lactique'], description: 'Micro-peeling BHA/AHA qui désincruste les pores, lisse la texture et estompe les marques de boutons.', price: 18.50, url: 'https://www.svr.com/en/sebiaclear-micro-peeling' },
  { name: 'SVR [Ac]² Crème Régulatrice', category: 'Treatment', concerns: ['acne', 'oiliness', 'pores', 'scars'], ingredients: ['Rétinol 0.1%', 'Acide Salicylique 0.5%', 'Niacinamide'], description: 'Crème régulatrice ciblée pour traiter les formes légères à modérées d\'acné et prévenir les récidives.', price: 20.90, url: 'https://www.svr.com/en/ac2-creme-regulatrice' }
];

async function seedProducts() {
  const client = new Client({
    connectionString: "postgresql://postgres:roua123@localhost:5432/deepskyn_db"
  });

  try {
    await client.connect();
    console.log('Connected to DB. Seeding SVR catalog...');

    for (const p of SVR_CATALOG) {
      const check = await client.query('SELECT id FROM products WHERE name = $1', [p.name]);
      if (check.rows.length === 0) {
          const query = `
            INSERT INTO products (id, name, description, price, product_type, clean_ingreds, target_issues, is_clean, product_url, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
          `;
          await client.query(query, [
            p.name,
            p.description,
            p.price,
            p.category,
            p.ingredients.join(','),
            p.concerns.join(','),
            p.url
          ]);
          console.log(`✅ Seeded: ${p.name}`);
      } else {
          console.log(`ℹ️ Skipped: ${p.name} (exists)`);
      }
    }
    console.log('✨ Seeding finished.');
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await client.end();
  }
}

seedProducts();
