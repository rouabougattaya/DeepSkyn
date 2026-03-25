const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function checkConstraints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dina1234*@localhost:5432/deepskyn_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query(`
      SELECT conname, contype, conrelid::regclass as table_name
      FROM pg_constraint
      WHERE conname = 'UQ_b443618a8149644123d48eceed4';
    `);

    if (res.rows.length > 0) {
      console.log('Constraint found:', res.rows[0]);
      
      // Try to find which columns are involved
      const colRes = await client.query(`
        SELECT 
            t.relname as table_name,
            array_to_string(array_agg(a.attname), ', ') as column_names
        FROM 
            pg_constraint c 
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            JOIN pg_class t ON t.oid = c.conrelid
        WHERE 
            c.conname = 'UQ_b443618a8149644123d48eceed4'
        GROUP BY t.relname;
      `);
      console.log('Involved columns:', colRes.rows[0]);

    } else {
      console.log('Constraint not found by exact name.');
      
      // Find all unique constraints on user table
      const allRes = await client.query(`
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = '"user"'::regclass;
      `);
       console.log('Unique constraints on "user" table:');
       allRes.rows.forEach(r => console.log(` - ${r.conname}: ${r.pg_get_constraintdef}`));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkConstraints();
