
const { Client } = require('pg');

async function checkProducts() {
  const client = new Client({
    connectionString: "postgresql://postgres:roua123@localhost:5432/deepskyn_db"
  });

  try {
    await client.connect();
    const res = await client.query('SELECT COUNT(*) FROM products');
    console.log('Product Count:', res.rows[0].count);
    
    if (res.rows[0].count > 0) {
        const sample = await client.query('SELECT id, name, product_type FROM products LIMIT 1');
        console.log('Sample Product:', JSON.stringify(sample.rows[0], null, 2));
    }
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    await client.end();
  }
}

checkProducts();
