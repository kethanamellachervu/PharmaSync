import { getSupabaseClient } from '../config/supabase.js';

async function auditDatabase() {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase client not initialized');
    return;
  }
  console.log('==================================================');
  console.log('🔍 PharmaSync Database Comprehensive Audit');
  console.log('==================================================');

  // 1. Medicines
  const { data: medicines, error: medErr } = await client
    .from('medicines')
    .select('id, name, generic_name, category, min_stock_level, purchase_price, selling_price, created_at')
    .order('created_at', { ascending: true });

  if (medErr) {
    console.error('Error fetching medicines:', medErr.message);
  } else {
    console.log(`\n💊 Total Medicines in DB: ${medicines?.length || 0}`);
    medicines?.forEach((m, idx) => {
      console.log(`  [${idx + 1}] ID: ${m.id} | Name: "${m.name}" | Cat: ${m.category} | Created: ${m.created_at}`);
    });
  }

  // 2. Batches
  const { data: batches, error: batchErr } = await client
    .from('batches')
    .select('id, medicine_id, batch_number, quantity, expiry_date, created_at')
    .order('created_at', { ascending: true });

  if (batchErr) {
    console.error('Error fetching batches:', batchErr.message);
  } else {
    console.log(`\n📦 Total Batches in DB: ${batches?.length || 0}`);
    batches?.slice(0, 10).forEach((b) => {
      console.log(`  Batch: ${b.batch_number} | MedID: ${b.medicine_id} | Qty: ${b.quantity} | Exp: ${b.expiry_date}`);
    });
    if ((batches?.length || 0) > 10) console.log(`  ... and ${(batches?.length || 0) - 10} more`);
  }

  // 3. Sales & Invoices
  const { data: sales, error: salesErr } = await client
    .from('sales')
    .select('id, sale_number, customer_name, total_amount, total_quantity, created_at')
    .order('created_at', { ascending: true });

  if (salesErr) {
    console.error('Error fetching sales:', salesErr.message);
  } else {
    console.log(`\n🧾 Total Sales in DB: ${sales?.length || 0}`);
    const demoInvoices = sales?.filter(s => s.sale_number?.startsWith('DEMO-INV-') || s.sale_number?.startsWith('INV-TEST-')) || [];
    const standardInvoices = sales?.filter(s => !s.sale_number?.startsWith('DEMO-INV-') && !s.sale_number?.startsWith('INV-TEST-')) || [];
    console.log(`  - Demo/Test Invoices (DEMO-INV-*): ${demoInvoices.length}`);
    console.log(`  - Standard Invoices: ${standardInvoices.length}`);
    sales?.slice(0, 5).forEach((s) => {
      console.log(`  Sample: ${s.sale_number} | Customer: ${s.customer_name} | Amount: ₹${s.total_amount} | Date: ${s.created_at}`);
    });
  }

  // 4. Suppliers
  const { data: suppliers, error: supErr } = await client
    .from('suppliers')
    .select('id, name, city, phone, email, is_demo, created_at')
    .order('created_at', { ascending: true });

  if (supErr) {
    console.error('Error fetching suppliers:', supErr.message);
  } else {
    console.log(`\n🏢 Total Suppliers in DB: ${suppliers?.length || 0}`);
    suppliers?.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ID: ${s.id} | Name: "${s.name}" | City: ${s.city} | is_demo: ${s.is_demo}`);
    });
  }

  // 5. Purchases
  const { data: purchases, error: purErr } = await client
    .from('purchases')
    .select('id, purchase_number, supplier_name, total_amount, created_at')
    .order('created_at', { ascending: true });

  if (purErr) {
    console.error('Error fetching purchases:', purErr.message);
  } else {
    console.log(`\n🛍️ Total Purchases in DB: ${purchases?.length || 0}`);
    purchases?.forEach((p) => {
      console.log(`  PO: ${p.purchase_number} | Supplier: ${p.supplier_name} | Amount: ₹${p.total_amount} | Date: ${p.created_at}`);
    });
  }

  // 6. Stock Movements
  const { data: movements, error: smErr } = await client
    .from('stock_movements')
    .select('id, medicine_id, movement_type, quantity, reason, created_at')
    .order('created_at', { ascending: true });

  if (smErr) {
    console.error('Error fetching stock movements:', smErr.message);
  } else {
    console.log(`\n🔄 Total Stock Movements in DB: ${movements?.length || 0}`);
  }

  console.log('\n==================================================');
}

auditDatabase().catch(console.error);
