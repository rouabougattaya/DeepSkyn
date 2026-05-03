
const { Client } = require('pg');

async function checkSvrProducts() {
  const client = new Client({
    connectionString: "postgresql://postgres:roua123@localhost:5432/deepskyn_db"
  });

  try {
    await client.connect();
    const res = await client.query("SELECT COUNT(*) FROM products WHERE name ILIKE '%SVR%'");
    console.log('SVR Products Count:', res.rows[0].count);
    
    if (res.rows[0].count > 0) {
        const sampleRes = await client.query("SELECT name FROM products WHERE name ILIKE '%SVR%' LIMIT 5");
        console.log('Sample SVR Products:', sampleRes.rows.map(r => r.name));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkSvrProducts();
