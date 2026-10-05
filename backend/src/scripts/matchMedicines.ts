import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '../config/supabase.js';

async function matchMedicines() {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase client not initialized');
    return;
  }

  const { data: dbMeds, error } = await client.from('medicines').select('id, name, generic_name');
  if (error || !dbMeds) {
    console.error('Failed to get db medicines:', error);
    return;
  }

  const csvPath = path.resolve('pharmasync_forecasting_dataset_6_months.csv');
  const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
  const csvMeds = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      csvMeds.set(parts[1].trim(), parts[2].trim());
    }
  }

  console.log(`Matching ${csvMeds.size} CSV medicines against ${dbMeds.length} DB medicines:`);

  const matched: any[] = [];
  const missing: any[] = [];

  for (const [csvId, csvName] of csvMeds.entries()) {
    // Normalization for comparison
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCsvName = norm(csvName);

    const found = dbMeds.find((m) => {
      const dbNorm = norm(m.name);
      return (
        dbNorm.includes(cleanCsvName) ||
        cleanCsvName.includes(dbNorm) ||
        (m.generic_name && norm(m.generic_name).includes(cleanCsvName))
      );
    });

    if (found) {
      matched.push({ csvId, csvName, dbId: found.id, dbName: found.name });
    } else {
      missing.push({ csvId, csvName });
    }
  }

  console.log(`\n✅ Matched: ${matched.length}/${csvMeds.size}`);
  matched.forEach((m) => console.log(`  [MATCH] ${m.csvId} (${m.csvName}) -> DB: ${m.dbName} (${m.dbId})`));

  console.log(`\n⚠️ Missing in DB: ${missing.length}`);
  missing.forEach((m) => console.log(`  [MISSING] ${m.csvId} (${m.csvName})`));
}

matchMedicines().catch(console.error);
