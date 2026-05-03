const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function logTableStructure(client, tableName) {
  const structure = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position;
  `, [tableName]);
  
  console.log(`\n=== ${tableName.toUpperCase()} TABLE STRUCTURE ===`);
  structure.rows.forEach(row => {
    console.log(`📋 ${row.column_name}: ${row.data_type}`);
  });
}

function getUserName(row) {
  if (row.name) return row.name;
  const first = row.firstName || '';
  const last = row.lastName || '';
  const combined = `${first} ${last}`.trim();
  return combined || 'N/A';
}

async function displayUsers(client) {
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
    console.log(`👤 Name: ${getUserName(row)}`);
    console.log(`🆔 User ID: ${row.user_id}`);
    console.log(`💳 Current Plan: ${row.current_plan || 'NO SUBSCRIPTION'}`);
    console.log(`📊 Status: ${row.subscription_status || 'N/A'}`);
    console.log(`📅 Start Date: ${row.startDate || 'N/A'}`);
    console.log(`📅 End Date: ${row.endDate || 'N/A'}`);
  });

  return result.rows;
}

async function updateUserToPro(client, targetUser) {
  if (targetUser.current_plan === 'PRO') {
    console.log('ℹ️ User already has PRO plan');
    return;
  }

  console.log('\n🔄 Updating subscription to PRO...');
  
  const existingSub = await client.query(`
    SELECT id FROM subscription WHERE "userId"::text = $1
  `, [targetUser.user_id]);
  
  if (existingSub.rows.length === 0) {
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
}

async function checkAndUpdateSubscription() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    await logTableStructure(client, 'user');
    await logTableStructure(client, 'subscription');

    const allUsers = await displayUsers(client);

    const targetEmail = process.argv[2];
    if (targetEmail) {
      console.log(`\n=== SEARCHING FOR USER: ${targetEmail} ===`);
      const targetUser = allUsers.find(row => row.email === targetEmail);
      
      if (targetUser) {
        console.log('✅ User found!');
        console.log(`Current plan: ${targetUser.current_plan}`);
        await updateUserToPro(client, targetUser);
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

checkAndUpdateSubscription();
