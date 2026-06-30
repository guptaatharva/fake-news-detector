const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wjaspbebjooqamyltpyh:atharva1808@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 5000,
});

async function test() {
  try {
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Connection error', err.stack);
  } finally {
    await client.end();
  }
}

test();
