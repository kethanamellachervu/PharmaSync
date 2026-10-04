import { getSupabaseClient } from '../config/supabase.js';

async function removeDemoSuppliers() {
  const client = getSupabaseClient();
  const demoNames = [
    'Deccan Pharma Distributors',
    'Telangana MedSupply',
    'Charminar Medical Agencies',
    'Medchal Healthcare Distributors',
    'Warangal Pharma Wholesale',
    'Nizamabad Medical Distributors',
    'Karimnagar Pharma Traders',
    'Hyderabad Generic Medicine Suppliers',
    'Rangareddy Healthcare Supplies',
    'South Telangana Pharma Agencies',
  ];

  console.log('Removing demo suppliers...');
  const { data, error } = await client
    .from('suppliers')
    .delete()
    .in('name', demoNames)
    .select('id, name');

  if (error) {
    console.error('Error deleting demo suppliers:', error.message);
  } else {
    console.log(`Deleted ${data?.length || 0} demo suppliers:`, data?.map(d => d.name));
  }
}

removeDemoSuppliers().catch(console.error);
