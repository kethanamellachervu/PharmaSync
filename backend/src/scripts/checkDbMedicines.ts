import { getSupabaseClient } from '../config/supabase.js';

async function main() {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase client not initialized');
    process.exit(1);
  }

  const { data: medicines, error: medError } = await client
    .from('medicines')
    .select('id, name, generic_name, category, min_stock_level, selling_price');

  if (medError) {
    console.error('Error fetching medicines:', medError);
    process.exit(1);
  }

  console.log(`Found ${medicines?.length} medicines in public.medicines:`);
  medicines?.forEach((m, i) => {
    console.log(`${i + 1}. ID: ${m.id} | Name: "${m.name}" | Generic: "${m.generic_name}"`);
  });

  const { data: batches, error: batchError } = await client
    .from('medicine_batches')
    .select('id, medicine_id, batch_number, quantity, expiry_date');

  console.log(`\nFound ${batches?.length} batches in public.medicine_batches:`);

  // Also check if historical_sales table exists
  const { data: histSample, error: histError, count: histCount } = await client
    .from('historical_sales')
    .select('*', { count: 'exact' })
    .limit(5);

  if (histError) {
    console.log(`\n'historical_sales' table check: ${histError.message} (Code: ${histError.code})`);
  } else {
    console.log(`\n'historical_sales' count: ${histCount}, sample rows:`, histSample?.length);
    if (histSample && histSample.length > 0) {
      console.log('Sample record 0:', histSample[0]);
    }
  }
}

main().catch(console.error);
