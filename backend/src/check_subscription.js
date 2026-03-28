const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function checkAndUpdateSubscription() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // First, let's check the structure of both tables
    const userTableStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== USER TABLE STRUCTURE ===');
    userTableStructure.rows.forEach(row => {
      console.log(`📋 ${row.column_name}: ${row.data_type}`);
    });

    const subscriptionTableStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscription' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== SUBSCRIPTION TABLE STRUCTURE ===');
    subscriptionTableStructure.rows.forEach(row => {
      console.log(`📋 ${row.column_name}: ${row.data_type}`);
    });

    // Get all users and their subscriptions
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
      LEFT JOIN subscription s ON u.id::text = s."userId"::text
      ORDER BY u.email;
    `;

    const result = await client.query(usersQuery);
    
    console.log('\n=== USERS AND SUBSCRIPTIONS ===');
    console.log('Total users found:', result.rows.length);
    
    result.rows.forEach(row => {
      console.log(`\n📧 Email: ${row.email}`);
      console.log(`👤 Name: ${row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A'}`);
      console.log(`🆔 User ID: ${row.user_id}`);
      console.log(`💳 Current Plan: ${row.current_plan || 'NO SUBSCRIPTION'}`);
      console.log(`📊 Status: ${row.subscription_status || 'N/A'}`);
      console.log(`📅 Start Date: ${row.startDate || 'N/A'}`);
      console.log(`📅 End Date: ${row.endDate || 'N/A'}`);
    });

    // Check for a specific user (you can modify this email)
    const targetEmail = process.argv[2]; // Pass email as argument
    if (targetEmail) {
      console.log(`\n=== SEARCHING FOR USER: ${targetEmail} ===`);
      const targetUser = result.rows.find(row => row.email === targetEmail);
      
      if (targetUser) {
        console.log('✅ User found!');
        console.log(`Current plan: ${targetUser.current_plan}`);
        
        // Ask if user wants to update to PRO
        if (targetUser.current_plan !== 'PRO' || !targetUser.current_plan) {
          console.log('\n🔄 Updating subscription to PRO...');
          
          // First check if subscription exists, if not create it
          const existingSub = await client.query(`
            SELECT id FROM subscription WHERE "userId"::text = $1
          `, [targetUser.user_id]);
          
          if (existingSub.rows.length === 0) {
            // Create new subscription
            const createQuery = `
              INSERT INTO subscription (
                "userId", plan, status, "startDate", "endDate", 
                "imagesUsed", "messagesUsed"
              ) VALUES ($1, 'PRO', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 0, 0)
              RETURNING id, plan, status, "startDate", "endDate"
            `;
            const createResult = await client.query(createQuery, [targetUser.user_id]);
            console.log('✅ New subscription created and set to PRO!');
            console.log('Created subscription:', createResult.rows[0]);
          } else {
            // Update existing subscription
            const updateQuery = `
              UPDATE subscription 
              SET plan = 'PRO', 
                  status = 'ACTIVE',
                  "startDate" = CURRENT_DATE,
                  "endDate" = CURRENT_DATE + INTERVAL '1 month'
              WHERE "userId"::text = $1
              RETURNING plan, status, "startDate", "endDate"
            `;
            const updateResult = await client.query(updateQuery, [targetUser.user_id]);
            console.log('✅ Subscription updated to PRO!');
            console.log('Updated subscription:', updateResult.rows[0]);
          }
        } else {
          console.log('ℹ️ User already has PRO plan');
        }
      } else {
        console.log('❌ User not found');
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

// Usage: node check_subscription.js [email@example.com]
checkAndUpdateSubscription();
