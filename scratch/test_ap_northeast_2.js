require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function test() {
  const url = new URL(process.env.DATABASE_URL);
  for (const n of [0, 1]) {
    const host = 'aws-' + n + '-ap-northeast-2.pooler.supabase.com';
    for (const port of [5432, 6543]) {
      const client = new Client({
        user: url.username,
        password: url.password,
        host: host,
        port: port,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      try {
        await client.connect();
        console.log('SUCCESS on', host, port);
        await client.end();
      } catch (e) {
        console.log(host + ':' + port + ' -> ' + e.message);
      }
    }
  }
}
test();
