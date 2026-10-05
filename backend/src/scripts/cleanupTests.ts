import { getSupabaseClient } from '../config/supabase.js';

async function cleanupTestPurchases() {
  const client = getSupabaseClient();
  if (!client) return;

  const { data: testPurchases } = await client
    .from('purchases')
    .select('id, purchase_number')
    .ilike('purchase_number', '%TEST%');

  if (testPurchases && testPurchases.length > 0) {
    for (const p of testPurchases) {
      await client.from('purchase_items').delete().eq('purchase_id', p.id);
      await client.from('purchases').delete().eq('id', p.id);
      console.log(`Deleted test purchase ${p.purchase_number}`);
    }
  }
}

cleanupTestPurchases().catch(console.error);
