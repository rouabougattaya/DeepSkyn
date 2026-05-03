const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function findPaidUsersWithFreePlan(client) {
  const paidUserQuery = `
    SELECT 
      p.id as payment_id,
      p."userId" as user_id,
      p.amount,
      p.status as payment_status,
      p."createdAt" as payment_date,
      u.email,
      s.id as subscription_id,
      s.plan as current_plan,
      s.status as subscription_status
    FROM payment p
    JOIN "user" u ON p."userId" = u.id::text
    LEFT JOIN subscription s ON p."subscriptionId" = s.id::text
    WHERE p.status = 'PAID' 
    AND (s.plan IS NULL OR s.plan = 'FREE')
    ORDER BY p."createdAt" DESC
  `;
  const result = await client.query(paidUserQuery);
  return result.rows;
}

async function updateOrCreateProSubscription(client, row) {
  if (row.subscription_id) {
    const updateQuery = `
      UPDATE subscription 
      SET plan = 'PRO', 
          status = 'ACTIVE',
          "startDate" = CURRENT_DATE,
          "endDate" = CURRENT_DATE + INTERVAL '1 month'
      WHERE id = $1
    `;
    await client.query(updateQuery, [row.subscription_id]);
    console.log('✅ Updated existing subscription to PRO');
  } else {
    const createQuery = `
      INSERT INTO subscription (
        "userId", plan, status, "startDate", "endDate", 
        "imagesUsed", "messagesUsed"
      ) VALUES ($1, 'PRO', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 0, 0)
    `;
    await client.query(createQuery, [row.user_id]);
    console.log('✅ Created new PRO subscription');
  }
}

async function linkPaymentToSubscription(client, row) {
  if (!row.subscription_id) {
    const newSubQuery = `SELECT id FROM subscription WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1`;
    const newSubResult = await client.query(newSubQuery, [row.user_id]);
    
    if (newSubResult.rows.length > 0) {
      const updatePaymentQuery = `
        UPDATE payment 
        SET "subscriptionId" = $1
        WHERE id = $2
      `;
      await client.query(updatePaymentQuery, [newSubResult.rows[0].id, row.payment_id]);
      console.log('✅ Linked payment to subscription');
    }
  }
}

async function verifyFixes(client) {
  console.log('\n=== VERIFICATION ===');
  const verificationQuery = `
    SELECT 
      u.email,
      s.plan,
      s.status,
      s."startDate",
      s."endDate",
      p.amount,
      p."createdAt" as payment_date
    FROM "user" u
    LEFT JOIN subscription s ON u.id::text = s."userId"
    LEFT JOIN payment p ON s.id::text = p."subscriptionId"
    WHERE u.email IN (
      SELECT email FROM payment WHERE status = 'PAID'
    )
    ORDER BY p."createdAt" DESC
  `;
  
  const verificationResult = await client.query(verificationQuery);
  
  verificationResult.rows.forEach(row => {
    console.log(`\n📧 ${row.email}`);
    console.log(`💳 Plan: ${row.plan || 'NO SUBSCRIPTION'}`);
    console.log(`💰 Payment: $${row.amount || '0'} on ${row.payment_date || 'NEVER'}`);
    console.log(`📅 Valid until: ${row.endDate || 'NO END DATE'}`);
  });
}

async function fixPaidSubscription() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const paidUsers = await findPaidUsersWithFreePlan(client);
    
    if (paidUsers.length === 0) {
      console.log('✅ No users with paid status but FREE plan found');
      return;
    }

    console.log(`\n=== FIXING ${paidUsers.length} PAID USERS ===`);
    
    for (const row of paidUsers) {
      console.log(`\n🔄 Fixing ${row.email}...`);
      console.log(`💰 Payment: $${row.amount} on ${row.payment_date}`);
      console.log(`💳 Current plan: ${row.current_plan || 'NO SUBSCRIPTION'}`);
      
      await updateOrCreateProSubscription(client, row);
      await linkPaymentToSubscription(client, row);
    }

    await verifyFixes(client);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixPaidSubscription();
