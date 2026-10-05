import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '../config/supabase.js';

interface CsvRecord {
  date: string;
  medicine_id: string;
  medicine_name: string;
  units_sold: number;
  stock_received: number;
  supplier_lead_time_days: number;
  reorder_level: number;
  closing_stock: number;
  month: number;
  day_of_week: string;
  is_weekend: number;
  sales_7d_avg: number;
  sales_30d_avg: number;
}

export async function importHistoricalSales() {
  console.log('==================================================');
  console.log('📦 PharmaSync – Historical Sales Dataset Import');
  console.log('==================================================');

  const client = getSupabaseClient();
  if (!client) {
    console.error('❌ Supabase client could not be initialized. Check .env');
    return { success: false, error: 'Supabase client not initialized' };
  }

  // 1. Locate CSV file
  const possiblePaths = [
    path.resolve('pharmasync_forecasting_dataset_6_months.csv'),
    path.resolve('../pharmasync_forecasting_dataset_6_months.csv'),
    path.resolve('c:/Users/ketha/smart-pharmacy/pharmasync_forecasting_dataset_6_months.csv'),
  ];

  let csvPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error('❌ CSV file pharmasync_forecasting_dataset_6_months.csv not found!');
    return { success: false, error: 'CSV file not found' };
  }

  console.log(`📄 Reading CSV from: ${csvPath}`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length <= 1) {
    console.error('❌ CSV file is empty or only contains header.');
    return { success: false, error: 'CSV is empty' };
  }

  const rawHeader = lines[0].split(',').map((h) => h.trim());
  console.log(`📋 Header: ${rawHeader.join(', ')}`);

  // 2. Fetch existing medicines to map matching UUIDs
  const { data: dbMeds, error: medError } = await client
    .from('medicines')
    .select('id, name, generic_name');

  if (medError) {
    console.warn(`⚠️ Could not fetch medicines from Supabase: ${medError.message}. Proceeding without foreign key linking.`);
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const findDbMatch = (csvName: string): string | null => {
    if (!dbMeds || dbMeds.length === 0) return null;
    const clean = norm(csvName);
    const found = dbMeds.find((m) => {
      const dbClean = norm(m.name);
      return (
        dbClean.includes(clean) ||
        clean.includes(dbClean) ||
        (m.generic_name && norm(m.generic_name).includes(clean))
      );
    });
    return found ? found.id : null;
  };

  // 3. Parse records
  const recordsToInsert: any[] = [];
  const uniqueMedsInCsv = new Map<string, { id: string; name: string; matchedDbUuid: string | null }>();
  let minDate = '9999-99-99';
  let maxDate = '0000-00-00';

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 13) continue;

    const rawDate = cols[0];
    const date = rawDate.split(' ')[0].trim();
    const medicineId = cols[1];
    const medicineName = cols[2];
    const unitsSold = parseInt(cols[3], 10) || 0;
    const stockReceived = parseInt(cols[4], 10) || 0;
    const supplierLeadTimeDays = parseInt(cols[5], 10) || 7;
    const reorderLevel = parseInt(cols[6], 10) || 50;
    const closingStock = parseInt(cols[7], 10) || 0;
    const month = parseInt(cols[8], 10) || (date ? parseInt(date.split('-')[1], 10) : 1);
    const dayOfWeek = cols[9] || 'Monday';
    const isWeekend = parseInt(cols[10], 10) || 0;
    const sales7dAvg = parseFloat(cols[11]) || 0.0;
    const sales30dAvg = parseFloat(cols[12]) || 0.0;

    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;

    if (!uniqueMedsInCsv.has(medicineId)) {
      uniqueMedsInCsv.set(medicineId, {
        id: medicineId,
        name: medicineName,
        matchedDbUuid: findDbMatch(medicineName),
      });
    }

    const matchedUuid = uniqueMedsInCsv.get(medicineId)!.matchedDbUuid;

    recordsToInsert.push({
      date,
      medicine_id: medicineId,
      matched_medicine_uuid: matchedUuid,
      medicine_name: medicineName,
      units_sold: unitsSold,
      stock_received: stockReceived,
      supplier_lead_time_days: supplierLeadTimeDays,
      reorder_level: reorderLevel,
      closing_stock: closingStock,
      month,
      day_of_week: dayOfWeek,
      is_weekend: isWeekend,
      sales_7d_avg: sales7dAvg,
      sales_30d_avg: sales30dAvg,
    });
  }

  console.log(`\n📊 Parsed ${recordsToInsert.length} records across ${uniqueMedsInCsv.size} unique medicines.`);
  console.log(`📅 Date range: ${minDate} to ${maxDate}`);

  let matchedCount = 0;
  const missingMeds: string[] = [];
  uniqueMedsInCsv.forEach((val) => {
    if (val.matchedDbUuid) {
      matchedCount++;
    } else {
      missingMeds.push(`${val.id} - ${val.name}`);
    }
  });

  console.log(`🔗 Medicines matched with existing DB medicines catalog: ${matchedCount}/${uniqueMedsInCsv.size}`);
  if (missingMeds.length > 0) {
    console.log(`ℹ️ Medicines in historical dataset without active live catalog entry (${missingMeds.length}):`);
    missingMeds.forEach((m) => console.log(`   - ${m}`));
  }

  // 4. Batch upsert into Supabase public.historical_sales
  console.log('\n🚀 Starting batch insertion into Supabase table public.historical_sales...');
  const BATCH_SIZE = 500;
  let insertedTotal = 0;

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const chunk = recordsToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await client
      .from('historical_sales')
      .upsert(chunk, { onConflict: 'date,medicine_id' });

    if (insertError) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${insertError.message} (Code: ${insertError.code})`);
      if (insertError.code === 'PGRST205' || insertError.message.includes('historical_sales')) {
        console.error('\n⚠️ TABLE DOES NOT EXIST YET IN SUPABASE!');
        console.error('Please run the migration in Supabase SQL editor:');
        console.error('File: supabase/migrations/20261005_historical_sales.sql');
        return {
          success: false,
          needsMigration: true,
          table: 'historical_sales',
          recordsReady: recordsToInsert.length,
          matchedMedicines: matchedCount,
          missingMedicines: missingMeds,
          minDate,
          maxDate,
        };
      }
      return { success: false, error: insertError.message };
    }

    insertedTotal += chunk.length;
    process.stdout.write(`\r   Progress: ${insertedTotal}/${recordsToInsert.length} records processed`);
  }

  console.log(`\n\n✅ Successfully imported ${insertedTotal} records into public.historical_sales!`);

  // 5. Verification queries
  const { count: finalCount, error: countErr } = await client
    .from('historical_sales')
    .select('id', { count: 'exact', head: true });

  console.log(`🔍 Verification query COUNT(*): ${finalCount} records in public.historical_sales`);

  return {
    success: true,
    table: 'historical_sales',
    recordsImported: insertedTotal,
    totalCountInDb: finalCount,
    uniqueMedicines: uniqueMedsInCsv.size,
    matchedMedicines: matchedCount,
    missingMedicines: missingMeds,
    minDate,
    maxDate,
  };
}

if (process.argv[1]?.includes('importHistoricalSales')) {
  importHistoricalSales().then((res) => {
    console.log('\nFinal result:', res);
  });
}
