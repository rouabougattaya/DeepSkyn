
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const inferType = (name, desc) => {
  const text = (name + ' ' + desc).toLowerCase();
  if (text.includes('sérum') || text.includes('ampoule')) return 'Serum';
  if (text.includes('nettoyant') || text.includes('gel moussant') || text.includes('eau micellaire') || text.includes('lait démaquillant')) return 'Cleanser';
  if (text.includes('spf') || text.includes('sun secure') || text.includes('solaire')) return 'Sunscreen';
  if (text.includes('contour des yeux') || text.includes('regard')) return 'Eye Care';
  if (text.includes('masque')) return 'Mask';
  if (text.includes('peel') || text.includes('exfoliant') || text.includes('gommage')) return 'Exfoliator';
  if (text.includes('crème') || text.includes('baume') || text.includes('hydra') || text.includes('riche') || text.includes('légère')) return 'Moisturiser';
  return 'Treatment';
};

async function insertProducts(client, products) {
  for (const p of products) {
    const type = inferType(p.name, p.description || '');
    const concerns = (p.target_concerns || []).join(',');
    
    const query = `
      INSERT INTO products (
        id, name, description, price, product_type, clean_ingreds, target_issues, 
        is_clean, image_url, product_url, "createdAt", "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, $8, NOW(), NOW())
    `;

    await client.query(query, [
      p.name,
      p.description || '',
      15.00,
      type,
      '',
      concerns,
      p.image || '',
      p.url || ''
    ]);
  }
}

async function importSvr() {
  const client = new Client({
    connectionString: "postgresql://postgres:roua123@localhost:5432/deepskyn_db"
  });

  try {
    await client.connect();
    console.log('🚀 Connected to DB. Starting Pure SVR Transformation...');

    console.log('🧹 Clearing existing products...');
    await client.query('DELETE FROM products');

    const jsonPath = path.join(__dirname, '..', 'data', 'svr_products.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const products = JSON.parse(rawData);
    console.log(`📦 Loaded ${products.length} products from JSON.`);

    await insertProducts(client, products);

    console.log('✨ Pure SVR Transformation Complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

importSvr();
