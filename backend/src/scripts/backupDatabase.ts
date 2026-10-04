import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '../config/supabase.js';

async function backupDatabase() {
  const client = getSupabaseClient();
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `backup_before_cleanup_${timestamp}.json`);

  console.log('📦 Starting database backup to:', backupFilePath);

  const [
    { data: medicines, error: medErr },
    { data: batches, error: batchErr },
    { data: sales, error: salesErr },
    { data: saleItems, error: siErr },
    { data: saleAllocations, error: saErr },
    { data: suppliers, error: supErr },
    { data: purchases, error: purErr },
    { data: purchaseItems, error: piErr },
    { data: movements, error: smErr },
  ] = await Promise.all([
    client.from('medicines').select('*'),
    client.from('medicine_batches').select('*'),
    client.from('sales').select('*'),
    client.from('sale_items').select('*'),
    client.from('sale_batch_allocations').select('*'),
    client.from('suppliers').select('*'),
    client.from('purchases').select('*'),
    client.from('purchase_items').select('*'),
    client.from('stock_movements').select('*'),
  ]);

  if (medErr) console.warn('Medicines backup warning:', medErr.message);
  if (batchErr) console.warn('Batches backup warning:', batchErr.message);
  if (salesErr) console.warn('Sales backup warning:', salesErr.message);

  const backupPayload = {
    timestamp: new Date().toISOString(),
    counts: {
      medicines: medicines?.length || 0,
      batches: batches?.length || 0,
      sales: sales?.length || 0,
      saleItems: saleItems?.length || 0,
      saleBatchAllocations: saleAllocations?.length || 0,
      suppliers: suppliers?.length || 0,
      purchases: purchases?.length || 0,
      purchaseItems: purchaseItems?.length || 0,
      stockMovements: movements?.length || 0,
    },
    tables: {
      medicines: medicines || [],
      medicine_batches: batches || [],
      sales: sales || [],
      sale_items: saleItems || [],
      sale_batch_allocations: saleAllocations || [],
      suppliers: suppliers || [],
      purchases: purchases || [],
      purchase_items: purchaseItems || [],
      stock_movements: movements || [],
    },
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
  console.log('✅ Backup completed successfully!');
  console.log('📊 Backup Summary:', JSON.stringify(backupPayload.counts, null, 2));
}

backupDatabase().catch(console.error);
