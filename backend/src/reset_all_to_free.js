const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function resetAllToFree() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Get all users and their current subscriptions
    const usersQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        u.name,
        u."firstName",
        u."lastName",
        s.id as subscription_id,
        s.plan as current_plan,
        s.status as subscription_status,
        s."startDate",
        s."endDate"
      FROM "user" u
      LEFT JOIN subscription s ON u.id::text = s."userId"
      ORDER BY u.email;
    `;

    const result = await client.query(usersQuery);
    
    console.log('\n=== RESETTING ALL USERS TO FREE ===');
    console.log('Total users found:', result.rows.length);
    
    for (const row of result.rows) {
      console.log(`\n🔄 Resetting ${row.email}...`);
      console.log(`💳 Current plan: ${row.current_plan || 'NO SUBSCRIPTION'}`);
      
      if (row.subscription_id) {
        // Update existing subscription to FREE
        const updateQuery = `
          UPDATE subscription 
          SET plan = 'FREE', 
              status = 'ACTIVE',
              "startDate" = CURRENT_DATE,
              "endDate" = CURRENT_DATE + INTERVAL '1 year'
          WHERE id = $1
        `;
        await client.query(updateQuery, [row.subscription_id]);
        console.log(`✅ Updated subscription to FREE (valid until 1 year)`);
      } else {
        // Create new FREE subscription
        const createQuery = `
          INSERT INTO subscription (
            "userId", plan, status, "startDate", "endDate", 
            "imagesUsed", "messagesUsed"
          ) VALUES ($1, 'FREE', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 0, 0)
        `;
        await client.query(createQuery, [row.user_id]);
        console.log(`✅ Created new FREE subscription (valid until 1 year)`);
      }
    }

    // Clean up all payments to start fresh
    console.log('\n=== CLEANING UP ALL PAYMENTS ===');
    const deletePaymentsQuery = `DELETE FROM payment`;
    await client.query(deletePaymentsQuery);
    console.log('✅ All payments deleted for fresh testing');

    console.log('\n=== VERIFICATION ===');
    const verificationResult = await client.query(usersQuery);
    
    verificationResult.rows.forEach(row => {
      console.log(`📧 ${row.email}: 💳 ${row.current_plan || 'NO SUBSCRIPTION'} - 📅 Valid: ${row.endDate || 'NO END DATE'}`);
    });

    console.log('\n✅ All users are now FREE! Ready for manual upgrade testing.');
    console.log('📝 You can now test the payment process from the frontend.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

resetAllToFree();
