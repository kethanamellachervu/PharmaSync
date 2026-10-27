import { getSupabaseClient } from '../config/supabase.js';

const ALL_30_MEDICINES = [
  { id: 'MED001', name: 'Paracetamol 500mg Tablets', generic_name: 'Paracetamol', category: 'Analgesics & Antipyretics', unit: 'tablets', min_stock_level: 30, selling_price: 18.00, purchase_price: 11.50, stock: 10000 },
  { id: 'MED002', name: 'Azithromycin 500mg Tablets', generic_name: 'Azithromycin', category: 'Antibiotics', unit: 'tablets', min_stock_level: 25, selling_price: 95.00, purchase_price: 64.00, stock: 120 },
  { id: 'MED003', name: 'Amoxicillin 500mg Capsules', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotics', unit: 'capsules', min_stock_level: 20, selling_price: 65.00, purchase_price: 42.00, stock: 530 },
  { id: 'MED004', name: 'Cetirizine 10mg Tablets', generic_name: 'Cetirizine Dihydrochloride', category: 'Antihistamines', unit: 'tablets', min_stock_level: 25, selling_price: 24.00, purchase_price: 15.00, stock: 753 },
  { id: 'MED005', name: 'Pantoprazole 40mg Tablets', generic_name: 'Pantoprazole Sodium', category: 'Gastrointestinal', unit: 'tablets', min_stock_level: 30, selling_price: 55.00, purchase_price: 34.00, stock: 95 },
  { id: 'MED006', name: 'Metformin 500mg Tablets', generic_name: 'Metformin Hydrochloride', category: 'Antidiabetic', unit: 'tablets', min_stock_level: 40, selling_price: 28.00, purchase_price: 17.50, stock: 112 },
  { id: 'MED007', name: 'Amlodipine 5mg Tablets', generic_name: 'Amlodipine Besylate', category: 'Cardiovascular', unit: 'tablets', min_stock_level: 20, selling_price: 25.00, purchase_price: 15.00, stock: 254 },
  { id: 'MED008', name: 'ORS Sachets (Electral)', generic_name: 'Oral Rehydration Salts', category: 'Oral Rehydration', unit: 'sachets', min_stock_level: 35, selling_price: 22.00, purchase_price: 13.50, stock: 140 },
  { id: 'MED009', name: 'Ibuprofen 400mg Tablets', generic_name: 'Ibuprofen BP', category: 'Analgesics & Anti-inflammatory', unit: 'tablets', min_stock_level: 25, selling_price: 26.00, purchase_price: 16.00, stock: 44 },
  { id: 'MED010', name: 'Vitamin C 500mg Chewable', generic_name: 'Ascorbic Acid', category: 'Vitamins & Supplements', unit: 'tablets', min_stock_level: 30, selling_price: 25.00, purchase_price: 15.00, stock: 110 },
  { id: 'MED011', name: 'Dolo 650mg Tablets', generic_name: 'Paracetamol 650mg', category: 'Analgesics & Antipyretics', unit: 'tablets', min_stock_level: 35, selling_price: 32.00, purchase_price: 21.00, stock: 119 },
  { id: 'MED012', name: 'Levocetirizine 5mg Tablets', generic_name: 'Levocetirizine Dihydrochloride', category: 'Antihistamines', unit: 'tablets', min_stock_level: 20, selling_price: 35.00, purchase_price: 22.00, stock: 180 },
  { id: 'MED013', name: 'Montelukast 10mg Tablets', generic_name: 'Montelukast Sodium', category: 'Respiratory', unit: 'tablets', min_stock_level: 20, selling_price: 92.00, purchase_price: 60.00, stock: 69 },
  { id: 'MED014', name: 'Diclofenac 50mg Tablets', generic_name: 'Diclofenac Sodium', category: 'Analgesics & Anti-inflammatory', unit: 'tablets', min_stock_level: 25, selling_price: 30.00, purchase_price: 18.00, stock: 210 },
  { id: 'MED015', name: 'Rabeprazole 20mg Tablets', generic_name: 'Rabeprazole Sodium', category: 'Gastrointestinal', unit: 'tablets', min_stock_level: 25, selling_price: 60.00, purchase_price: 38.00, stock: 85 },
  { id: 'MED016', name: 'Domperidone 10mg Tablets', generic_name: 'Domperidone Maleate', category: 'Gastrointestinal', unit: 'tablets', min_stock_level: 20, selling_price: 28.00, purchase_price: 16.00, stock: 150 },
  { id: 'MED017', name: 'Losartan 50mg Tablets', generic_name: 'Losartan Potassium', category: 'Cardiovascular', unit: 'tablets', min_stock_level: 20, selling_price: 45.00, purchase_price: 28.00, stock: 130 },
  { id: 'MED018', name: 'Atorvastatin 10mg Tablets', generic_name: 'Atorvastatin Calcium', category: 'Cardiovascular', unit: 'tablets', min_stock_level: 25, selling_price: 68.00, purchase_price: 44.00, stock: 90 },
  { id: 'MED019', name: 'Clopidogrel 75mg Tablets', generic_name: 'Clopidogrel Bisulfate', category: 'Cardiovascular', unit: 'tablets', min_stock_level: 15, selling_price: 85.00, purchase_price: 55.00, stock: 75 },
  { id: 'MED020', name: 'Glimepiride 2mg Tablets', generic_name: 'Glimepiride', category: 'Antidiabetic', unit: 'tablets', min_stock_level: 25, selling_price: 40.00, purchase_price: 25.00, stock: 160 },
  { id: 'MED021', name: 'Azithromycin 250mg Tablets', generic_name: 'Azithromycin Dihydrate', category: 'Antibiotics', unit: 'tablets', min_stock_level: 15, selling_price: 60.00, purchase_price: 38.00, stock: 95 },
  { id: 'MED022', name: 'Cefixime 200mg Tablets', generic_name: 'Cefixime Trihydrate', category: 'Antibiotics', unit: 'tablets', min_stock_level: 20, selling_price: 110.00, purchase_price: 72.00, stock: 80 },
  { id: 'MED023', name: 'Calcium + Vitamin D3 Tablets', generic_name: 'Calcium Carbonate + Cholecalciferol', category: 'Mineral Supplements', unit: 'tablets', min_stock_level: 25, selling_price: 85.00, purchase_price: 56.00, stock: 220 },
  { id: 'MED024', name: 'Multivitamin Tablets', generic_name: 'Multivitamins & Minerals', category: 'Vitamins & Supplements', unit: 'tablets', min_stock_level: 30, selling_price: 50.00, purchase_price: 30.00, stock: 310 },
  { id: 'MED025', name: 'Aspirin 75mg Tablets', generic_name: 'Acetylsalicylic Acid', category: 'Cardiovascular', unit: 'tablets', min_stock_level: 30, selling_price: 15.00, purchase_price: 9.00, stock: 400 },
  { id: 'MED026', name: 'ORS Tablets', generic_name: 'Oral Rehydration Salts', category: 'Oral Rehydration', unit: 'tablets', min_stock_level: 20, selling_price: 20.00, purchase_price: 12.00, stock: 190 },
  { id: 'MED027', name: 'Folic Acid 5mg Tablets', generic_name: 'Folic Acid', category: 'Vitamins & Supplements', unit: 'tablets', min_stock_level: 25, selling_price: 18.00, purchase_price: 10.00, stock: 260 },
  { id: 'MED028', name: 'Ondansetron 4mg Tablets', generic_name: 'Ondansetron Hydrochloride', category: 'Gastrointestinal', unit: 'tablets', min_stock_level: 15, selling_price: 42.00, purchase_price: 26.00, stock: 110 },
  { id: 'MED029', name: 'Alprazolam 0.25mg Tablets', generic_name: 'Alprazolam', category: 'Central Nervous System', unit: 'tablets', min_stock_level: 15, selling_price: 25.00, purchase_price: 14.00, stock: 95 },
  { id: 'MED030', name: 'Montelukast + Levocetirizine Tablets', generic_name: 'Montelukast + Levocetirizine', category: 'Respiratory', unit: 'tablets', min_stock_level: 20, selling_price: 125.00, purchase_price: 82.00, stock: 140 },
];

export async function seedAll30Medicines() {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase client not initialized');
    return;
  }

  console.log('Syncing all 30 medicines into Supabase public.medicines...');
  const { data: existingMeds } = await client.from('medicines').select('id, name');

  for (const m of ALL_30_MEDICINES) {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = norm(m.name);

    const found = existingMeds?.find((ex) => {
      const exClean = norm(ex.name);
      return exClean.includes(cleanTarget) || cleanTarget.includes(exClean);
    });

    let medId = found ? found.id : null;

    if (!medId) {
      const { data: inserted, error: insErr } = await client
        .from('medicines')
        .insert({
          name: m.name,
          generic_name: m.generic_name,
          category: m.category,
          unit: m.unit,
          min_stock_level: m.min_stock_level,
          selling_price: m.selling_price,
          purchase_price: m.purchase_price,
        })
        .select()
        .single();

      if (insErr) {
        console.error(`Failed to insert medicine ${m.name}:`, insErr.message);
        continue;
      }
      medId = inserted.id;
      console.log(`✅ Created medicine: ${m.name} (${medId})`);
    } else {
      console.log(`ℹ️ Already exists: ${m.name} (${medId})`);
    }

    const { data: batches } = await client
      .from('medicine_batches')
      .select('id')
      .eq('medicine_id', medId);

    if (!batches || batches.length === 0) {
      const batchNum = `BATCH-${m.id}-1`;
      await client.from('medicine_batches').insert({
        medicine_id: medId,
        batch_number: batchNum,
        quantity: m.stock,
        mfg_date: '2026-01-01',
        expiry_date: '2028-12-31',
      });
      console.log(`   📦 Added batch ${batchNum} with ${m.stock} units.`);
    }
  }

  const { data: finalMeds } = await client.from('medicines').select('id');
  console.log(`✨ Done! Total medicines in Supabase: ${finalMeds?.length}`);
}

seedAll30Medicines().catch(console.error);
