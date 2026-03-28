const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function checkStripeSessions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Check if there are any records of checkout sessions
    console.log('\n=== CHECKING FOR STRIPE SESSIONS ===');
    
    // Look for any recent activity that might indicate a payment process
    const userQuery = `
      SELECT 
        u.email,
        u.id as user_id,
        u."createdAt" as user_created
      FROM "user" u
      WHERE u.email = $1
    `;
    
    const userResult = await client.query(userQuery, ['dinamechergui7@gmail.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`\n📧 User: ${user.email}`);
    console.log(`🆔 User ID: ${user.user_id}`);
    
    // Check payments for this user
    const paymentQuery = `
      SELECT 
        p.*,
        s.plan as subscription_plan_after_payment
      FROM payment p
      LEFT JOIN subscription s ON p."subscriptionId" = s.id::text
      WHERE p."userId" = $1
      ORDER BY p."createdAt" DESC
    `;
    
    const paymentResult = await client.query(paymentQuery, [user.user_id]);
    
    console.log(`\n💳 Payments found: ${paymentResult.rows.length}`);
    paymentResult.rows.forEach(row => {
      console.log(`  💰 Amount: $${row.amount} - Status: ${row.status} - Date: ${row.createdAt}`);
      if (row.subscription_plan_after_payment) {
        console.log(`  🎯 Plan after: ${row.subscription_plan_after_payment}`);
      }
    });
    
    // Check subscription
    const subscriptionQuery = `
      SELECT 
        s.*,
        u.email
      FROM subscription s
      JOIN "user" u ON s."userId" = u.id::text
      WHERE u.email = $1
    `;
    
    const subscriptionResult = await client.query(subscriptionQuery, ['dinamechergui7@gmail.com']);
    
    console.log(`\n📋 Subscriptions found: ${subscriptionResult.rows.length}`);
    subscriptionResult.rows.forEach(row => {
      console.log(`  💳 Plan: ${row.plan} - Status: ${row.status}`);
      console.log(`  📅 Valid until: ${row.endDate}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkStripeSessions();
