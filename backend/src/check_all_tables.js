const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    
    // Check payment table structure
    const paymentStructure = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment' ORDER BY ordinal_position");
    console.log('=== PAYMENT TABLE STRUCTURE ===');
    paymentStructure.rows.forEach(row => {
      console.log(`📋 ${row.column_name}: ${row.data_type}`);
    });

    // Check subscription table structure  
    const subscriptionStructure = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscription' ORDER BY ordinal_position");
    console.log('\n=== SUBSCRIPTION TABLE STRUCTURE ===');
    subscriptionStructure.rows.forEach(row => {
      console.log(`📋 ${row.column_name}: ${row.data_type}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
