const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function simulateCompletePayment() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Get the user who needs PRO upgrade
    const userQuery = `
      SELECT id, email, "firstName", "lastName", name
      FROM "user" 
      WHERE email = $1
    `;
    
    const userResult = await client.query(userQuery, ['dinamechergui7@gmail.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`\n🔄 Simulating complete payment for ${user.email}...`);
    
    // 1. First, create or update subscription to PRO
    const existingSubQuery = `
      SELECT id FROM subscription WHERE "userId" = $1
    `;
    
    const existingSubResult = await client.query(existingSubQuery, [user.id]);
    let subscriptionId;
    
    if (existingSubResult.rows.length > 0) {
      // Update existing subscription
      const updateSubQuery = `
        UPDATE subscription 
        SET plan = 'PRO', 
            status = 'ACTIVE',
            "startDate" = CURRENT_DATE,
            "endDate" = CURRENT_DATE + INTERVAL '1 month'
        WHERE id = $1
        RETURNING id
      `;
      const updateResult = await client.query(updateSubQuery, [existingSubResult.rows[0].id]);
      subscriptionId = updateResult.rows[0].id;
      console.log('✅ Updated existing subscription to PRO');
    } else {
      // Create new subscription
      const createSubQuery = `
        INSERT INTO subscription (
          "userId", plan, status, "startDate", "endDate", 
          "imagesUsed", "messagesUsed"
        ) VALUES ($1, 'PRO', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 0, 0)
        RETURNING id
      `;
      const createResult = await client.query(createSubQuery, [user.id]);
      subscriptionId = createResult.rows[0].id;
      console.log(`✅ Created new PRO subscription: ${subscriptionId}`);
    }
    
    // 2. Create payment record linked to subscription
    const paymentQuery = `
      INSERT INTO payment (
        "userId", 
        "subscriptionId",
        amount, 
        currency, 
        status, 
        "createdAt"
      ) VALUES ($1, $2, 9.99, 'USD', 'PAID', NOW())
      RETURNING id
    `;
    
    const paymentResult = await client.query(paymentQuery, [user.id, subscriptionId]);
    const paymentId = paymentResult.rows[0].id;
    console.log(`✅ Payment created: ${paymentId}`);
    
    // 3. Verification
    console.log('\n=== VERIFICATION ===');
    const verifyQuery = `
      SELECT 
        u.email,
        s.plan,
        s.status,
        s."startDate",
        s."endDate",
        p.amount,
        p.status as payment_status,
        p."createdAt" as payment_date
      FROM "user" u
      JOIN subscription s ON u.id::text = s."userId"
      JOIN payment p ON s.id::text = p."subscriptionId"
      WHERE u.email = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, ['dinamechergui7@gmail.com']);
    
    if (verifyResult.rows.length > 0) {
      const row = verifyResult.rows[0];
      console.log(`\n📧 Email: ${row.email}`);
      console.log(`💳 Plan: ${row.plan}`);
      console.log(`📊 Status: ${row.status}`);
      console.log(`💰 Payment: $${row.amount} (${row.payment_status})`);
      console.log(`📅 Payment date: ${row.payment_date}`);
      console.log(`📅 Valid until: ${row.endDate}`);
      console.log('\n✅ User is now PRO! The dashboard should show advanced statistics.');
    } else {
      console.log('❌ Verification failed');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

simulateCompletePayment();
