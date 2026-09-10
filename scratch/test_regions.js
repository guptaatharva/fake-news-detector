require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function test() {
  const url = new URL(process.env.DATABASE_URL);
  const regions = [
    'ap-south-1',
    'ap-southeast-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'us-east-1',
    'eu-central-1',
    'eu-west-1'
  ];
  for (const r of regions) {
    for (const n of [0, 1]) {
      const host = 'aws-' + n + '-' + r + '.pooler.supabase.com';
      for (const port of [5432, 6543]) {
        const client = new Client({
          user: url.username,
          password: url.password,
          host: host,
          port: port,
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000
        });
        try {
          await client.connect();
          console.log('SUCCESS on', host, port);
          await client.end();
          return;
        } catch (e) {
          console.log(host + ':' + port + ' -> ' + e.message);
        }
      }
    }
  }
}
test();
