const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkUser(email) {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "user" WHERE email = $1', [email]);
        if (res.rows.length > 0) {
            console.log(`✅ User found: ${email}`);
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log(`❌ User NOT found: ${email}`);
        }
    } catch (err) {
        console.error('Error connecting to DB:', err);
    } finally {
        await client.end();
    }
}

const emailToCheck = process.argv[2] || 'yathreblouba@gmail.com';
checkUser(emailToCheck);
