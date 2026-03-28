const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function checkPaymentTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payment' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== PAYMENT TABLE STRUCTURE ===');
    structure.rows.forEach(row => {
      console.log(`📋 ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkPaymentTable();
