import { getSupabaseClient } from '../config/supabase.js';

async function cleanupDemoAndTestData() {
  const client = getSupabaseClient();
  console.log('==================================================');
  console.log('🧹 PharmaSync Production Database Cleanup');
  console.log('==================================================');

  // 1. Delete Demo Sales (DEMO-INV-*)
  console.log('1️⃣ Cleaning up Demo & Test Sales...');
  const { data: demoSales, error: demoSalesErr } = await client
    .from('sales')
    .select('id, sale_number')
    .or('sale_number.ilike.DEMO-INV-%,sale_number.ilike.INV-TEST-%,customer_name.ilike.%Test%');

  if (demoSalesErr) {
    console.error('Error fetching demo sales:', demoSalesErr.message);
  } else if (demoSales && demoSales.length > 0) {
    console.log(`  Found ${demoSales.length} demo/test sales to remove.`);
    const saleIds = demoSales.map((s) => s.id);

    // Delete sale items & allocations
    for (let i = 0; i < saleIds.length; i += 50) {
      const batchIds = saleIds.slice(i, i + 50);
      const { data: items } = await client.from('sale_items').select('id').in('sale_id', batchIds);
      if (items && items.length > 0) {
        const itemIds = items.map((it) => it.id);
        await client.from('sale_batch_allocations').delete().in('sale_item_id', itemIds);
        await client.from('sale_items').delete().in('sale_id', batchIds);
      }
      await client.from('sales').delete().in('id', batchIds);
    }
    console.log(`  ✅ Removed ${demoSales.length} demo/test sales.`);
  } else {
    console.log('  No demo/test sales found.');
  }

  // 2. Delete Test Purchases (Automated test POs & test bill scans)
  console.log('\n2️⃣ Cleaning up Automated Test Purchases...');
  const { data: testPurchases } = await client
    .from('purchases')
    .select('id, purchase_number')
    .or('notes.ilike.%Automated test purchase order%,purchase_number.ilike.INV-TEST-INV-%');

  if (testPurchases && testPurchases.length > 0) {
    console.log(`  Found ${testPurchases.length} test purchases to remove.`);
    const purIds = testPurchases.map((p) => p.id);
    await client.from('purchase_items').delete().in('purchase_id', purIds);
    await client.from('purchases').delete().in('id', purIds);
    console.log(`  ✅ Removed ${testPurchases.length} test purchases.`);
  } else {
    console.log('  No test purchases found.');
  }

  // 3. Delete Test Suppliers and Demo Suppliers
  console.log('\n3️⃣ Cleaning up Test & Demo Suppliers...');
  const { data: demoSuppliers } = await client
    .from('suppliers')
    .select('id, name')
    .or('name.ilike.Test Healthcare Dist%,contact_person.ilike.%(Demo)%');

  if (demoSuppliers && demoSuppliers.length > 0) {
    console.log(`  Found ${demoSuppliers.length} test/demo suppliers to remove.`);
    const supIds = demoSuppliers.map((s) => s.id);
    for (const supId of supIds) {
      // Check if any purchases reference this supplier
      const { count } = await client.from('purchases').select('*', { count: 'exact', head: true }).eq('supplier_id', supId);
      if (count && count > 0) {
        console.log(`  Skipping supplier ${supId} because it is referenced by existing purchase.`);
      } else {
        await client.from('suppliers').delete().eq('id', supId);
      }
    }
    console.log(`  ✅ Cleaned up test/demo suppliers.`);
  } else {
    console.log('  No test/demo suppliers found.');
  }

  // 4. Delete "Test Ibuprofen 400mg" duplicate test medicines
  console.log('\n4️⃣ Cleaning up Test Medicines ("Test Ibuprofen 400mg")...');
  const { data: testMeds } = await client
    .from('medicines')
    .select('id, name')
    .ilike('name', 'Test Ibuprofen%');

  if (testMeds && testMeds.length > 0) {
    console.log(`  Found ${testMeds.length} test medicine records to remove.`);
    for (const med of testMeds) {
      await client.from('stock_movements').delete().eq('medicine_id', med.id);
      await client.from('purchase_items').delete().eq('medicine_id', med.id);
      await client.from('sale_items').delete().eq('medicine_id', med.id);
      await client.from('medicine_batches').delete().eq('medicine_id', med.id);
      await client.from('medicines').delete().eq('id', med.id);
    }
    console.log(`  ✅ Removed ${testMeds.length} test medicine records.`);
  } else {
    console.log('  No test medicines found.');
  }

  // 5. Clean up Stock Movements with demo reasons
  console.log('\n5️⃣ Cleaning up Demo Stock Movements...');
  const { error: smErr } = await client
    .from('stock_movements')
    .delete()
    .or('reason.ilike.%DEMO-INV-%,reason.ilike.%Test Ibuprofen%');
  if (!smErr) {
    console.log('  ✅ Cleaned up demo stock movements.');
  }

  console.log('\n==================================================');
  console.log('🎉 Production Database Cleanup Complete!');
  console.log('==================================================');
}

cleanupDemoAndTestData().catch(console.error);
