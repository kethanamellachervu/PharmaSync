import { envConfig } from '../config/env.js';

async function testSqlEndpoint() {
  const url = 'https://pwlqsqtwebzqdrnrotzj.supabase.co';
  const key = envConfig.supabaseServiceRoleKey;
  console.log('Testing SQL execution endpoints...');

  // Try pg query endpoint
  try {
    const res = await fetch(`${url}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key!,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query: 'SELECT 1;' }),
    });
    console.log('/pg/query status:', res.status, await res.text());
  } catch (e: any) {
    console.log('/pg/query failed:', e.message);
  }

  // Try rest query
  try {
    const res2 = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key!,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ sql: 'SELECT 1;' }),
    });
    console.log('/rest/v1/rpc/exec_sql status:', res2.status, await res2.text());
  } catch (e: any) {
    console.log('/rest/v1/rpc/exec_sql failed:', e.message);
  }
}

testSqlEndpoint().catch(console.error);
