const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function diagnosePaymentIssue() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Check recent payments
    console.log('\n=== RECENT PAYMENTS ===');
    const paymentsQuery = `
      SELECT 
        p.*,
        u.email,
        s.plan as subscription_plan_after_payment
      FROM payment p
      JOIN "user" u ON p."userId" = u.id::text
      LEFT JOIN subscription s ON p."subscriptionId" = s.id::text
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `;
    
    const paymentsResult = await client.query(paymentsQuery);
    
    if (paymentsResult.rows.length === 0) {
      console.log('❌ No payments found in database');
    } else {
      paymentsResult.rows.forEach(row => {
        console.log(`\n💰 Payment ID: ${row.id}`);
        console.log(`📧 Email: ${row.email}`);
        console.log(`💳 Amount: $${row.amount}`);
        console.log(`📊 Status: ${row.status}`);
        console.log(`🔗 Transaction: ${row.konnectTransactionId}`);
        console.log(`📅 Date: ${row.createdAt}`);
        console.log(`🎯 Plan after payment: ${row.subscription_plan_after_payment || 'NOT FOUND'}`);
      });
    }

    // 2. Check current subscriptions
    console.log('\n=== CURRENT SUBSCRIPTIONS ===');
    const subscriptionsQuery = `
      SELECT 
        s.*,
        u.email
      FROM subscription s
      JOIN "user" u ON s."userId" = u.id::text
      ORDER BY s."startDate" DESC
    `;
    
    const subscriptionsResult = await client.query(subscriptionsQuery);
    
    subscriptionsResult.rows.forEach(row => {
      console.log(`\n📧 Email: ${row.email}`);
      console.log(`💳 Plan: ${row.plan}`);
      console.log(`📊 Status: ${row.status}`);
      console.log(`📅 Start: ${row.startDate}`);
      console.log(`📅 End: ${row.endDate}`);
      console.log(`🔄 Updated: ${row.updatedAt}`);
    });

    // 3. Check for users with recent activity but no payment
    console.log('\n=== USERS WITHOUT RECENT PAYMENTS ===');
    const usersWithoutPaymentQuery = `
      SELECT 
        u.email,
        u."createdAt" as user_created,
        MAX(p."createdAt") as last_payment_date
      FROM "user" u
      LEFT JOIN payment p ON u.id::text = p."userId"
      GROUP BY u.id, u.email, u."createdAt"
      ORDER BY u."createdAt" DESC
    `;
    
    const usersWithoutPaymentResult = await client.query(usersWithoutPaymentQuery);
    
    usersWithoutPaymentResult.rows.forEach(row => {
      if (!row.last_payment_date) {
        console.log(`❌ ${row.email} - No payments ever (created: ${row.user_created})`);
      } else {
        console.log(`✅ ${row.email} - Last payment: ${row.last_payment_date}`);
      }
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

diagnosePaymentIssue();
