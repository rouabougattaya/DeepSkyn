const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    const result = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'id'");
    console.log('User ID column:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
