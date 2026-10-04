import { getSupabaseClient } from '../config/supabase.js';

async function inspectSuppliersAndPurchases() {
  const client = getSupabaseClient();
  const { data: suppliers } = await client.from('suppliers').select('*');
  console.log('SUPPLIERS COUNT:', suppliers?.length);
  suppliers?.forEach(s => console.log(JSON.stringify(s)));

  const { data: purchases } = await client.from('purchases').select('*');
  console.log('PURCHASES COUNT:', purchases?.length);
  purchases?.forEach(p => console.log(JSON.stringify(p)));

  const { data: sales } = await client.from('sales').select('id, sale_number, customer_name, total_amount, created_at');
  console.log('SALES COUNT:', sales?.length);
  const testSales = sales?.filter(s => s.sale_number?.startsWith('DEMO-INV-') || s.sale_number?.startsWith('INV-TEST-') || s.customer_name?.includes('Test') || s.customer_name?.includes('Demo'));
  console.log('DEMO/TEST SALES COUNT:', testSales?.length);
  const realSales = sales?.filter(s => !s.sale_number?.startsWith('DEMO-INV-') && !s.sale_number?.startsWith('INV-TEST-') && !s.customer_name?.includes('Test') && !s.customer_name?.includes('Demo'));
  console.log('NON-DEMO SALES COUNT:', realSales?.length);
  realSales?.forEach(s => console.log('  Non-demo sale:', JSON.stringify(s)));
}

inspectSuppliersAndPurchases().catch(console.error);
