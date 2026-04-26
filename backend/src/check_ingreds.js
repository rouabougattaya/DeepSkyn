
const { Client } = require('pg');

async function checkProducts() {
  const client = new Client({
    connectionString: "postgresql://postgres:roua123@localhost:5432/deepskyn_db"
  });

  try {
    await client.connect();
    const sample = await client.query('SELECT clean_ingreds FROM products WHERE clean_ingreds IS NOT NULL LIMIT 1');
    console.log('Sample clean_ingreds (Raw):', JSON.stringify(sample.rows[0], null, 2));
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    await client.end();
  }
}

checkProducts();
