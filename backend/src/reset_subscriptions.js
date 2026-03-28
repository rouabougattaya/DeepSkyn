const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function resetSubscriptions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

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
    
    console.log('\n=== RESETTING ALL SUBSCRIPTIONS TO FREE ===');
    console.log('Total users found:', result.rows.length);
    
    // List of users to keep as PRO (modify this as needed)
    const keepAsPro = [
      'dina.mechergui@esprit.tn', // Change this to the email you want to keep as PRO
    ];

    for (const row of result.rows) {
      if (keepAsPro.includes(row.email)) {
        console.log(`⏭️  Skipping ${row.email} (keeping as PRO)`);
        continue;
      }

      console.log(`🔄 Resetting ${row.email} to FREE...`);
      
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
        console.log(`✅ Updated subscription for ${row.email} to FREE`);
      } else {
        // Create new FREE subscription
        const createQuery = `
          INSERT INTO subscription (
            "userId", plan, status, "startDate", "endDate", 
            "imagesUsed", "messagesUsed"
          ) VALUES ($1, 'FREE', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 0, 0)
        `;
        await client.query(createQuery, [row.user_id]);
        console.log(`✅ Created FREE subscription for ${row.email}`);
      }
    }

    console.log('\n=== VERIFICATION ===');
    const verificationResult = await client.query(usersQuery);
    
    verificationResult.rows.forEach(row => {
      console.log(`📧 ${row.email}: 💳 ${row.current_plan || 'NO SUBSCRIPTION'}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

resetSubscriptions();
