import { envConfig } from '../config/env.js';

async function main() {
  const res = await fetch('https://pwlqsqtwebzqdrnrotzj.supabase.co/rest/v1/', {
    headers: {
      apikey: envConfig.supabaseServiceRoleKey!,
      Authorization: `Bearer ${envConfig.supabaseServiceRoleKey}`,
    },
  });
  const json: any = await res.json();
  const tables = Object.keys(json.definitions || {});
  console.log('Tables exposed in Supabase public schema:');
  console.log(tables);
}

main().catch(console.error);
