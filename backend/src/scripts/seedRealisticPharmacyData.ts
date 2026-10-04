import { getSupabaseClient } from '../config/supabase.js';
import { envConfig } from '../config/env.js';
import dotenv from 'dotenv';
dotenv.config();

interface DemoSupplierSeed {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  productCategories: string[];
  paymentTerms: string;
  deliveryTime: string;
  minOrderAmount: number;
}

const TELANGANA_DEMO_SUPPLIERS: DemoSupplierSeed[] = [
  {
    name: 'Deccan Pharma Distributors',
    contactPerson: 'Srinivas Rao (Demo)',
    phone: '+91 98490 12001',
    email: 'orders@deccanpharma.example.com',
    address: 'Plot 42, Balanagar Industrial Area, Hyderabad, Telangana - 500037',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500037',
    productCategories: ['Analgesics', 'Antipyretics', 'Cardiovascular', 'Gastrointestinal'],
    paymentTerms: 'Net 30 Days',
    deliveryTime: '24-48 Hours',
    minOrderAmount: 3000,
  },
  {
    name: 'Telangana MedSupply',
    contactPerson: 'Kavitha Reddy (Demo)',
    phone: '+91 98490 12002',
    email: 'sales@telanganamed.example.com',
    address: 'Building 14, Ranigunj Commercial Complex, Secunderabad, Telangana - 500003',
    city: 'Secunderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500003',
    productCategories: ['Antibiotics', 'Respiratory', 'Pediatric Formulations'],
    paymentTerms: 'Net 15 Days',
    deliveryTime: 'Same Day (Hyd/Sec)',
    minOrderAmount: 2500,
  },
  {
    name: 'Charminar Medical Agencies',
    contactPerson: 'Mohammed Farooq (Demo)',
    phone: '+91 98490 12003',
    email: 'contact@charminarmedical.example.com',
    address: 'Shop 8-2, Koti Medical Wholesale Market, Hyderabad, Telangana - 500095',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500095',
    productCategories: ['Generics', 'Vitamins & Supplements', 'OTC Medicines'],
    paymentTerms: 'Immediate UPI/Cash',
    deliveryTime: '24 Hours',
    minOrderAmount: 1500,
  },
  {
    name: 'Medchal Healthcare Distributors',
    contactPerson: 'Venkatesh Goud (Demo)',
    phone: '+91 98490 12004',
    email: 'orders@medchalhealth.example.com',
    address: 'NH-44 Highway Pharma Hub, Kompally, Medchal, Telangana - 501401',
    city: 'Medchal',
    district: 'Medchal-Malkajgiri',
    state: 'Telangana',
    pincode: '501401',
    productCategories: ['Antibiotics', 'IV Fluids', 'Surgical & Bandages'],
    paymentTerms: 'Net 30 Days',
    deliveryTime: '24-48 Hours',
    minOrderAmount: 5000,
  },
  {
    name: 'Warangal Pharma Wholesale',
    contactPerson: 'Praveen Chary (Demo)',
    phone: '+91 98490 12005',
    email: 'supply@warangalpharma.example.com',
    address: 'Main Road, Naimnagar, Hanamkonda, Warangal, Telangana - 506009',
    city: 'Warangal',
    district: 'Warangal Urban',
    state: 'Telangana',
    pincode: '506009',
    productCategories: ['Antidiabetic', 'Cardiovascular', 'Analgesics'],
    paymentTerms: 'Net 21 Days',
    deliveryTime: '48 Hours',
    minOrderAmount: 4000,
  },
  {
    name: 'Nizamabad Medical Distributors',
    contactPerson: 'Rajeshwar Sharma (Demo)',
    phone: '+91 98490 12006',
    email: 'orders@nizamabadmed.example.com',
    address: 'Khaleelwadi Commercial Hub, Nizamabad, Telangana - 503001',
    city: 'Nizamabad',
    district: 'Nizamabad',
    state: 'Telangana',
    pincode: '503001',
    productCategories: ['Oral Rehydration', 'Antihistamines', 'Antibiotics'],
    paymentTerms: 'Net 15 Days',
    deliveryTime: '48-72 Hours',
    minOrderAmount: 3000,
  },
  {
    name: 'Karimnagar Pharma Traders',
    contactPerson: 'Suresh Varma (Demo)',
    phone: '+91 98490 12007',
    email: 'info@karimnagarpharma.example.com',
    address: 'Near Collectorate Circle, Karimnagar, Telangana - 505001',
    city: 'Karimnagar',
    district: 'Karimnagar',
    state: 'Telangana',
    pincode: '505001',
    productCategories: ['Mineral Supplements', 'Vitamins', 'Cough Preparations'],
    paymentTerms: 'Net 30 Days',
    deliveryTime: '48 Hours',
    minOrderAmount: 3500,
  },
  {
    name: 'Hyderabad Generic Medicine Suppliers',
    contactPerson: 'Anand Kumar (Demo)',
    phone: '+91 98490 12008',
    email: 'desk@hydgenerics.example.com',
    address: 'Sanath Nagar Industrial Estate, Hyderabad, Telangana - 500018',
    city: 'Hyderabad',
    district: 'Hyderabad',
    state: 'Telangana',
    pincode: '500018',
    productCategories: ['Generics', 'Jan Aushadhi Equivalents', 'Chronic Care'],
    paymentTerms: 'Immediate UPI/Cash',
    deliveryTime: 'Same Day (Hyderabad)',
    minOrderAmount: 2000,
  },
  {
    name: 'Rangareddy Healthcare Supplies',
    contactPerson: 'Manohar Naidu (Demo)',
    phone: '+91 98490 12009',
    email: 'orders@rangareddyhealth.example.com',
    address: 'Airport Road Logistic Park, Shamshabad, Rangareddy, Telangana - 501218',
    city: 'Shamshabad',
    district: 'Rangareddy',
    state: 'Telangana',
    pincode: '501218',
    productCategories: ['Emergency Care', 'Critical Antibiotics', 'Cold Chain Products'],
    paymentTerms: 'Net 30 Days',
    deliveryTime: '24 Hours',
    minOrderAmount: 5000,
  },
  {
    name: 'South Telangana Pharma Agencies',
    contactPerson: 'Balaiah Goud (Demo)',
    phone: '+91 98490 12010',
    email: 'sales@southtelanganapharma.example.com',
    address: 'Railway Station Road Wholesale Market, Mahabubnagar, Telangana - 509001',
    city: 'Mahabubnagar',
    district: 'Mahabubnagar',
    state: 'Telangana',
    pincode: '509001',
    productCategories: ['General Pharmaceuticals', 'Syrups & Suspensions'],
    paymentTerms: 'Net 15 Days',
    deliveryTime: '48-72 Hours',
    minOrderAmount: 2500,
  },
];

interface DemoBatchSeed {
  batchNumber: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  mfgDate?: string;
}

interface DemoMedicineSeed {
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  description: string;
  unit: string;
  minStockLevel: number;
  sellingPrice: number;
  purchasePrice: number;
  preferredSupplierName: string;
  batches: DemoBatchSeed[];
}

export async function seedRealisticData() {
  console.log('==================================================');
  console.log('🌿 Seeding Realistic Pharmacy Demo Data (Telangana)');
  console.log('==================================================');

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available. Check environment variables.');
  }

  // 1. Seed Telangana Demo Suppliers (Idempotent by name)
  console.log('\n[1/4] Checking and Seeding Telangana Demo Suppliers...');
  const supplierIdMap = new Map<string, string>();

  for (const s of TELANGANA_DEMO_SUPPLIERS) {
    const { data: existing } = await client
      .from('suppliers')
      .select('id, name')
      .eq('name', s.name)
      .maybeSingle();

    if (existing) {
      supplierIdMap.set(s.name, existing.id);
      // Update address to make sure latest Telangana location info is recorded
      await client
        .from('suppliers')
        .update({
          contact_person: s.contactPerson,
          phone: s.phone,
          email: s.email,
          address: s.address,
        })
        .eq('id', existing.id);
      console.log(`  ✓ Supplier exists: ${s.name} (${s.city})`);
    } else {
      const { data: inserted, error } = await client
        .from('suppliers')
        .insert({
          name: s.name,
          contact_person: s.contactPerson,
          phone: s.phone,
          email: s.email,
          address: s.address,
        })
        .select()
        .single();

      if (error || !inserted) {
        console.error(`  ❌ Failed inserting supplier ${s.name}:`, error?.message);
      } else {
        supplierIdMap.set(s.name, inserted.id);
        console.log(`  + Created supplier: ${s.name} (${s.city})`);
      }
    }
  }

  // Helper date calculations
  const today = new Date();
  const formatIsoDate = (d: Date) => d.toISOString().split('T')[0];

  const inDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return formatIsoDate(d);
  };

  const agoDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return formatIsoDate(d);
  };

  // 2. Realistic Medicine Inventory Data with diverse stock conditions
  const REALISTIC_MEDICINES: DemoMedicineSeed[] = [
    // 1. Paracetamol 500 mg - Healthy stock + 1 Near Expiry batch!
    {
      name: 'Paracetamol 500mg Tablets',
      genericName: 'Paracetamol (Acetaminophen)',
      category: 'Analgesics & Antipyretics',
      manufacturer: 'GSK India / Cipla Ltd',
      description: 'First-line analgesic and antipyretic for mild-to-moderate fever and body aches.',
      unit: 'tablets',
      minStockLevel: 30,
      sellingPrice: 18.0,
      purchasePrice: 11.5,
      preferredSupplierName: 'Deccan Pharma Distributors',
      batches: [
        { batchNumber: 'PCM-2027A', quantity: 65, expiryDate: inDays(380), mfgDate: agoDays(120) },
        { batchNumber: 'PCM-EXP-01', quantity: 10, expiryDate: inDays(14), mfgDate: agoDays(600) }, // NEAR EXPIRY (< 30 days)
      ],
    },
    // 2. Dolo 650 mg - Healthy stock, high volume
    {
      name: 'Dolo 650mg Tablets',
      genericName: 'Paracetamol 650mg',
      category: 'Analgesics & Antipyretics',
      manufacturer: 'Micro Labs Ltd',
      description: 'Higher-strength paracetamol for intense fever, viral pyrexia, and pain.',
      unit: 'tablets',
      minStockLevel: 35,
      sellingPrice: 32.0,
      purchasePrice: 21.0,
      preferredSupplierName: 'Deccan Pharma Distributors',
      batches: [
        { batchNumber: 'DOLO-9921', quantity: 80, expiryDate: inDays(450), mfgDate: agoDays(90) },
        { batchNumber: 'DOLO-9922', quantity: 50, expiryDate: inDays(620), mfgDate: agoDays(40) },
      ],
    },
    // 3. Cetirizine 10 mg - Near Expiry Batch + healthy batch
    {
      name: 'Cetirizine 10mg Tablets',
      genericName: 'Cetirizine Dihydrochloride',
      category: 'Antihistamines',
      manufacturer: 'Dr. Reddy’s Laboratories',
      description: 'Second-generation non-sedating antihistamine for seasonal rhinitis and allergic rash.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 24.0,
      purchasePrice: 15.0,
      preferredSupplierName: 'Hyderabad Generic Medicine Suppliers',
      batches: [
        { batchNumber: 'CTZ-NEAR-01', quantity: 8, expiryDate: inDays(22), mfgDate: agoDays(580) }, // NEAR EXPIRY (< 30 days)
        { batchNumber: 'CTZ-2027B', quantity: 45, expiryDate: inDays(480), mfgDate: agoDays(60) },
      ],
    },
    // 4. Amoxicillin 500 mg - Multiple Batches, steady stock
    {
      name: 'Amoxicillin 500mg Capsules',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Alkem Laboratories',
      description: 'Broad-spectrum beta-lactam antibiotic for ENT, respiratory, and soft tissue infections.',
      unit: 'capsules',
      minStockLevel: 20,
      sellingPrice: 65.0,
      purchasePrice: 42.0,
      preferredSupplierName: 'Telangana MedSupply',
      batches: [
        { batchNumber: 'AMX-204', quantity: 30, expiryDate: inDays(320), mfgDate: agoDays(100) },
        { batchNumber: 'AMX-505', quantity: 40, expiryDate: inDays(540), mfgDate: agoDays(30) },
      ],
    },
    // 5. Azithromycin 500 mg - OUT OF STOCK! (Quantity 0)
    {
      name: 'Azithromycin 500mg Tablets',
      genericName: 'Azithromycin Dihydrate',
      category: 'Antibiotics',
      manufacturer: 'Cipla Ltd',
      description: 'Macrolide antibiotic 3-day/5-day regimen for upper respiratory and atypical infections.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 95.0,
      purchasePrice: 64.0,
      preferredSupplierName: 'Medchal Healthcare Distributors',
      batches: [], // ZERO BATCHES -> Out of Stock!
    },
    // 6. Metformin 500 mg - LOW STOCK (Below reorder level!)
    {
      name: 'Metformin 500mg Tablets',
      genericName: 'Metformin Hydrochloride (Sustained Release)',
      category: 'Antidiabetic',
      manufacturer: 'USV Private Ltd',
      description: 'Essential biguanide antihyperglycemic agent for Type 2 Diabetes Mellitus management.',
      unit: 'tablets',
      minStockLevel: 40,
      sellingPrice: 28.0,
      purchasePrice: 17.5,
      preferredSupplierName: 'Warangal Pharma Wholesale',
      batches: [
        { batchNumber: 'MET-501', quantity: 12, expiryDate: inDays(400), mfgDate: agoDays(110) }, // 12 < 40 minStock -> LOW STOCK!
      ],
    },
    // 7. Pantoprazole 40 mg - Healthy stock
    {
      name: 'Pantoprazole 40mg Tablets',
      genericName: 'Pantoprazole Sodium (Gastro-resistant)',
      category: 'Gastrointestinal',
      manufacturer: 'Sun Pharma Ltd',
      description: 'Proton pump inhibitor for GERD, gastric acidity, and peptic ulcer prophylaxis.',
      unit: 'tablets',
      minStockLevel: 30,
      sellingPrice: 55.0,
      purchasePrice: 34.0,
      preferredSupplierName: 'Deccan Pharma Distributors',
      batches: [
        { batchNumber: 'PAN-410', quantity: 95, expiryDate: inDays(420), mfgDate: agoDays(80) },
      ],
    },
    // 8. Vitamin C 500 mg - Healthy stock
    {
      name: 'Vitamin C 500mg Chewable',
      genericName: 'Ascorbic Acid + Sodium Ascorbate',
      category: 'Vitamins & Supplements',
      manufacturer: 'Abbott Healthcare',
      description: 'Antioxidant immune booster and tissue collagen repair chewable tablet.',
      unit: 'tablets',
      minStockLevel: 30,
      sellingPrice: 25.0,
      purchasePrice: 15.0,
      preferredSupplierName: 'Charminar Medical Agencies',
      batches: [
        { batchNumber: 'VITC-801', quantity: 110, expiryDate: inDays(490), mfgDate: agoDays(70) },
      ],
    },
    // 9. ORS Sachets - LOW STOCK (Below reorder level!)
    {
      name: 'ORS Sachets (Electral)',
      genericName: 'Oral Rehydration Salts (WHO Formulation)',
      category: 'Oral Rehydration',
      manufacturer: 'FDC Ltd',
      description: 'WHO-formula balanced electrolyte rehydration powder for dehydration due to diarrhea.',
      unit: 'sachets',
      minStockLevel: 35,
      sellingPrice: 22.0,
      purchasePrice: 13.5,
      preferredSupplierName: 'Nizamabad Medical Distributors',
      batches: [
        { batchNumber: 'ORS-102', quantity: 9, expiryDate: inDays(350), mfgDate: agoDays(140) }, // 9 < 35 minStock -> LOW STOCK!
      ],
    },
    // 10. Ibuprofen 400 mg - Healthy stock
    {
      name: 'Ibuprofen 400mg Tablets',
      genericName: 'Ibuprofen BP',
      category: 'Analgesics & Anti-inflammatory',
      manufacturer: 'Abbott India',
      description: 'NSAID for dental pain, dysmenorrhea, musculoskeletal inflammation, and arthritis.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 26.0,
      purchasePrice: 16.0,
      preferredSupplierName: 'Warangal Pharma Wholesale',
      batches: [
        { batchNumber: 'IBU-402', quantity: 45, expiryDate: inDays(360), mfgDate: agoDays(150) },
      ],
    },
    // 11. Cough Syrup - Healthy batch + EXPIRED BATCH!
    {
      name: 'Ascoril D Plus Cough Syrup 100ml',
      genericName: 'Dextromethorphan + Chlorpheniramine + Phenylephrine',
      category: 'Respiratory',
      manufacturer: 'Glenmark Pharmaceuticals',
      description: 'Triple-combination sugar-free syrup for dry irritating cough, throat tickle, and congestion.',
      unit: 'bottles',
      minStockLevel: 15,
      sellingPrice: 115.0,
      purchasePrice: 75.0,
      preferredSupplierName: 'Karimnagar Pharma Traders',
      batches: [
        { batchNumber: 'CS-LIVE-01', quantity: 24, expiryDate: inDays(300), mfgDate: agoDays(120) },
        { batchNumber: 'CS-EXP-99', quantity: 6, expiryDate: agoDays(35), mfgDate: agoDays(650) }, // EXPIRED!
      ],
    },
    // 12. Calcium Tablets - Healthy stock
    {
      name: 'Shelcal 500mg Tablets',
      genericName: 'Calcium Carbonate + Vitamin D3',
      category: 'Mineral Supplements',
      manufacturer: 'Torrent Pharmaceuticals',
      description: 'Elemental calcium supplement fortified with Cholecalciferol for bone mineral density.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 85.0,
      purchasePrice: 56.0,
      preferredSupplierName: 'Karimnagar Pharma Traders',
      batches: [
        { batchNumber: 'CAL-701', quantity: 60, expiryDate: inDays(410), mfgDate: agoDays(100) },
      ],
    },
    // 13. Multivitamin Tablets - Healthy stock
    {
      name: 'Becosules Capsules',
      genericName: 'B-Complex Forte with Vitamin C',
      category: 'Vitamins & Supplements',
      manufacturer: 'Pfizer Ltd',
      description: 'Therapeutic high-potency vitamin B-complex with ascorbic acid for mouth ulcers and fatigue.',
      unit: 'capsules',
      minStockLevel: 30,
      sellingPrice: 48.0,
      purchasePrice: 31.0,
      preferredSupplierName: 'Charminar Medical Agencies',
      batches: [
        { batchNumber: 'MULTI-301', quantity: 75, expiryDate: inDays(440), mfgDate: agoDays(90) },
      ],
    },
    // 14. Antacid Tablets - Healthy batch + EXPIRED BATCH!
    {
      name: 'Digene Chewable Antacid Tablets',
      genericName: 'Dried Aluminium Hydroxide + Magnesium Hydroxide + Simethicone',
      category: 'Gastrointestinal',
      manufacturer: 'Abbott Healthcare',
      description: 'Fast-relief antacid and antiflatulent for heartburn, hyperacidity, and sour stomach.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 20.0,
      purchasePrice: 12.5,
      preferredSupplierName: 'Charminar Medical Agencies',
      batches: [
        { batchNumber: 'ANT-LIVE-01', quantity: 40, expiryDate: inDays(380), mfgDate: agoDays(100) },
        { batchNumber: 'ANT-EXP-00', quantity: 8, expiryDate: agoDays(45), mfgDate: agoDays(700) }, // EXPIRED!
      ],
    },
    // 15. Omeprazole 20 mg - Healthy stock
    {
      name: 'Omez 20mg Capsules',
      genericName: 'Omeprazole BP',
      category: 'Gastrointestinal',
      manufacturer: 'Dr. Reddy’s Laboratories',
      description: 'Acid suppressor capsule for duodenal ulcer, gastric reflux, and NSAID gastroprotection.',
      unit: 'capsules',
      minStockLevel: 25,
      sellingPrice: 45.0,
      purchasePrice: 28.0,
      preferredSupplierName: 'Hyderabad Generic Medicine Suppliers',
      batches: [
        { batchNumber: 'OMZ-101', quantity: 50, expiryDate: inDays(390), mfgDate: agoDays(110) },
      ],
    },
    // 16. Atorvastatin 10 mg - Healthy stock
    {
      name: 'Atorva 10mg Tablets',
      genericName: 'Atorvastatin Calcium',
      category: 'Cardiovascular',
      manufacturer: 'Zydus Cadila',
      description: 'HMG-CoA reductase inhibitor statin for dyslipidemia and cardiovascular risk reduction.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 68.0,
      purchasePrice: 44.0,
      preferredSupplierName: 'Rangareddy Healthcare Supplies',
      batches: [
        { batchNumber: 'ATR-201', quantity: 40, expiryDate: inDays(460), mfgDate: agoDays(80) },
      ],
    },
    // 17. Telmisartan 40 mg - Healthy stock
    {
      name: 'Telma 40mg Tablets',
      genericName: 'Telmisartan BP',
      category: 'Cardiovascular',
      manufacturer: 'Glenmark Pharmaceuticals',
      description: 'Angiotensin II receptor blocker (ARB) for essential hypertension management.',
      unit: 'tablets',
      minStockLevel: 25,
      sellingPrice: 58.0,
      purchasePrice: 36.0,
      preferredSupplierName: 'Rangareddy Healthcare Supplies',
      batches: [
        { batchNumber: 'TEL-301', quantity: 55, expiryDate: inDays(510), mfgDate: agoDays(75) },
      ],
    },
    // 18. Montelukast 10 mg - Healthy stock
    {
      name: 'Montair 10mg Tablets',
      genericName: 'Montelukast Sodium',
      category: 'Respiratory',
      manufacturer: 'Cipla Ltd',
      description: 'Leukotriene receptor antagonist for prophylaxis of bronchial asthma and allergic rhinitis.',
      unit: 'tablets',
      minStockLevel: 20,
      sellingPrice: 92.0,
      purchasePrice: 60.0,
      preferredSupplierName: 'Telangana MedSupply',
      batches: [
        { batchNumber: 'MON-401', quantity: 35, expiryDate: inDays(480), mfgDate: agoDays(95) },
      ],
    },
  ];

  // 2. Seed Medicines and Batches (Idempotent by name)
  console.log('\n[2/4] Checking and Seeding Realistic Medicines & Batches...');
  const medicineIdMap = new Map<string, string>();

  for (const m of REALISTIC_MEDICINES) {
    let medId: string;
    const { data: existing } = await client
      .from('medicines')
      .select('id, name')
      .eq('name', m.name)
      .maybeSingle();

    if (existing) {
      medId = existing.id;
      medicineIdMap.set(m.name, medId);
      // Update details to ensure correct categories and prices
      await client
        .from('medicines')
        .update({
          generic_name: m.genericName,
          category: m.category,
          manufacturer: m.manufacturer,
          description: m.description,
          unit: m.unit,
          min_stock_level: m.minStockLevel,
          selling_price: m.sellingPrice,
          purchase_price: m.purchasePrice,
        })
        .eq('id', medId);
      console.log(`  ✓ Medicine exists: ${m.name}`);
    } else {
      const { data: inserted, error } = await client
        .from('medicines')
        .insert({
          name: m.name,
          generic_name: m.genericName,
          category: m.category,
          manufacturer: m.manufacturer,
          description: m.description,
          unit: m.unit,
          min_stock_level: m.minStockLevel,
          selling_price: m.sellingPrice,
          purchase_price: m.purchasePrice,
        })
        .select()
        .single();

      if (error || !inserted) {
        console.error(`  ❌ Failed inserting medicine ${m.name}:`, error?.message);
        continue;
      }
      medId = inserted.id;
      medicineIdMap.set(m.name, medId);
      console.log(`  + Created medicine: ${m.name}`);
    }

    // Now seed or update batches
    for (const b of m.batches) {
      const { data: existingBatch } = await client
        .from('medicine_batches')
        .select('id, quantity')
        .eq('medicine_id', medId)
        .eq('batch_number', b.batchNumber)
        .maybeSingle();

      if (existingBatch) {
        // Ensure quantity matches desired demo state
        await client
          .from('medicine_batches')
          .update({
            quantity: b.quantity,
            expiry_date: b.expiryDate,
            mfg_date: b.mfgDate || null,
          })
          .eq('id', existingBatch.id);
        console.log(`    ✓ Batch ${b.batchNumber}: ${b.quantity} ${m.unit} (Exp: ${b.expiryDate})`);
      } else {
        const { error: batchErr } = await client.from('medicine_batches').insert({
          medicine_id: medId,
          batch_number: b.batchNumber,
          quantity: b.quantity,
          expiry_date: b.expiryDate,
          mfg_date: b.mfgDate || null,
        });
        if (batchErr) {
          console.error(`    ❌ Failed batch ${b.batchNumber}:`, batchErr.message);
        } else {
          console.log(`    + Added batch ${b.batchNumber}: ${b.quantity} ${m.unit} (Exp: ${b.expiryDate})`);
        }
      }
    }
  }

  // 3. Seed Realistic 30-Day Historical Sales (for Demand Forecasting & Dashboard Trends)
  console.log('\n[3/4] Checking and Seeding Realistic Sales History for AI Forecasting...');
  const { count: existingSalesCount } = await client
    .from('sales')
    .select('id', { count: 'exact', head: true });

  if ((existingSalesCount || 0) < 15) {
    console.log(`  Current sales count: ${existingSalesCount || 0}. Generating 30 days of sales history...`);

    const customers = [
      'Ramesh Patel', 'Sunita Rao', 'Pooja Verma', 'Amitabh Sen', 'Kavita Reddy',
      'Rajesh Kumar', 'Deepa Nair', 'Vikas Sharma', 'Ananya Iyer', 'Mohammed Farooq',
      'Sneha Joshi', 'Arun Mehra', 'Bhavna Dave', 'Suresh Menon', 'Priyanka Das',
      'Venkat Raman', 'Sandhya Rani', 'Kiranmai Devi', 'Satish Goud', 'Haritha Chary'
    ];

    const targetMedicines = [
      { name: 'Paracetamol 500mg Tablets', price: 18.0, baseQty: 10, trend: 'increasing' },
      { name: 'Dolo 650mg Tablets', price: 32.0, baseQty: 8, trend: 'stable' },
      { name: 'Pantoprazole 40mg Tablets', price: 55.0, baseQty: 4, trend: 'stable' },
      { name: 'Cetirizine 10mg Tablets', price: 24.0, baseQty: 5, trend: 'increasing' },
      { name: 'Vitamin C 500mg Chewable', price: 25.0, baseQty: 6, trend: 'stable' },
      { name: 'Amoxicillin 500mg Capsules', price: 65.0, baseQty: 2, trend: 'stable' },
      { name: 'Shelcal 500mg Tablets', price: 85.0, baseQty: 3, trend: 'stable' },
    ];

    let seedCounter = 5000;

    for (let day = 29; day >= 0; day--) {
      const saleDate = new Date(Date.now() - day * 24 * 3600 * 1000);
      const dayIndex = 29 - day;

      for (const tm of targetMedicines) {
        const medId = medicineIdMap.get(tm.name);
        if (!medId) continue;

        // Skip some days for antibiotic to have realistic lower volume
        if (tm.name === 'Amoxicillin 500mg Capsules' && day % 2 === 0) continue;

        let dailyQty = tm.baseQty;
        if (tm.trend === 'increasing') {
          dailyQty = day <= 10 ? tm.baseQty + 4 + (dayIndex % 3) : tm.baseQty - 2 + (dayIndex % 2);
        } else {
          dailyQty = tm.baseQty + ((dayIndex % 3) - 1);
        }
        if (dailyQty <= 0) dailyQty = 1;

        seedCounter++;
        const saleNumber = `DEMO-INV-${seedCounter}`;
        const cust = customers[(day * 3 + seedCounter) % customers.length];
        const subtotal = Math.round(dailyQty * tm.price * 100) / 100;
        const timestamp = new Date(new Date(saleDate).setHours(10 + (day % 8), 15 + (day % 40), 0, 0)).toISOString();

        // Check if saleNumber already exists
        const { data: existingSale } = await client
          .from('sales')
          .select('id')
          .eq('sale_number', saleNumber)
          .maybeSingle();

        if (existingSale) continue;

        const { data: newSale, error: saleErr } = await client
          .from('sales')
          .insert({
            sale_number: saleNumber,
            customer_name: cust,
            total_items: 1,
            total_quantity: dailyQty,
            total_amount: subtotal,
            created_at: timestamp,
          })
          .select()
          .single();

        if (saleErr || !newSale) continue;

        // Insert sale_item
        await client.from('sale_items').insert({
          sale_id: newSale.id,
          medicine_id: medId,
          medicine_name: tm.name,
          unit: 'tablets',
          quantity: dailyQty,
          unit_price: tm.price,
          subtotal,
          created_at: timestamp,
        });
      }
    }
    console.log('  ✓ 30 days of realistic sales seeded successfully for forecasting!');
  } else {
    console.log(`  ✓ Sufficient sales records already exist (${existingSalesCount} sales found).`);
  }

  // 4. Seed Inward Purchase Orders from Telangana Suppliers
  console.log('\n[4/4] Checking and Seeding Demo Purchase Invoices from Telangana Suppliers...');
  const { count: purchaseCount } = await client
    .from('purchases')
    .select('id', { count: 'exact', head: true });

  if ((purchaseCount || 0) < 6) {
    const demoPurchases = [
      {
        poNumber: 'PO-TS-2026-001',
        supplierName: 'Deccan Pharma Distributors',
        notes: 'Monthly bulk procurement for Analgesics and PPIs (Hyderabad Hub)',
        createdAt: agoDays(25),
        items: [
          { medName: 'Paracetamol 500mg Tablets', qty: 100, price: 11.5, batchNumber: 'PCM-2027A', exp: inDays(380) },
          { medName: 'Dolo 650mg Tablets', qty: 120, price: 21.0, batchNumber: 'DOLO-9921', exp: inDays(450) },
        ],
      },
      {
        poNumber: 'PO-TS-2026-002',
        supplierName: 'Telangana MedSupply',
        notes: 'Antibiotic inventory restock (Secunderabad depot)',
        createdAt: agoDays(18),
        items: [
          { medName: 'Amoxicillin 500mg Capsules', qty: 50, price: 42.0, batchNumber: 'AMX-204', exp: inDays(320) },
          { medName: 'Montelukast 10mg Tablets', qty: 40, price: 60.0, batchNumber: 'MON-401', exp: inDays(480) },
        ],
      },
      {
        poNumber: 'PO-TS-2026-003',
        supplierName: 'Charminar Medical Agencies',
        notes: 'Vitamins & OTC products direct supply (Koti Market)',
        createdAt: agoDays(12),
        items: [
          { medName: 'Vitamin C 500mg Chewable', qty: 150, price: 15.0, batchNumber: 'VITC-801', exp: inDays(490) },
          { medName: 'Becosules Capsules', qty: 80, price: 31.0, batchNumber: 'MULTI-301', exp: inDays(440) },
        ],
      },
      {
        poNumber: 'PO-TS-2026-004',
        supplierName: 'Medchal Healthcare Distributors',
        notes: 'Specialist anti-infectives replenishment order',
        createdAt: agoDays(5),
        items: [
          { medName: 'Amoxicillin 500mg Capsules', qty: 60, price: 42.0, batchNumber: 'AMX-505', exp: inDays(540) },
        ],
      },
      {
        poNumber: 'PO-TS-2026-005',
        supplierName: 'Warangal Pharma Wholesale',
        notes: 'Chronic care & NSAID reorder (Warangal Urban dispatch)',
        createdAt: agoDays(2),
        items: [
          { medName: 'Ibuprofen 400mg Tablets', qty: 50, price: 16.0, batchNumber: 'IBU-402', exp: inDays(360) },
          { medName: 'Metformin 500mg Tablets', qty: 30, price: 17.5, batchNumber: 'MET-501', exp: inDays(400) },
        ],
      },
    ];

    for (const dp of demoPurchases) {
      const suppId = supplierIdMap.get(dp.supplierName);
      if (!suppId) continue;

      const { data: existingPo } = await client
        .from('purchases')
        .select('id')
        .eq('purchase_number', dp.poNumber)
        .maybeSingle();

      if (existingPo) continue;

      let totalQty = 0;
      let totalAmt = 0;
      for (const it of dp.items) {
        totalQty += it.qty;
        totalAmt += Math.round(it.qty * it.price * 100) / 100;
      }

      const { data: insertedPo, error: poErr } = await client
        .from('purchases')
        .insert({
          purchase_number: dp.poNumber,
          supplier_id: suppId,
          total_quantity: totalQty,
          total_amount: totalAmt,
          notes: dp.notes,
          created_at: new Date(dp.createdAt).toISOString(),
        })
        .select()
        .single();

      if (poErr || !insertedPo) continue;

      for (const it of dp.items) {
        const medId = medicineIdMap.get(it.medName);
        if (!medId) continue;

        await client.from('purchase_items').insert({
          purchase_id: insertedPo.id,
          medicine_id: medId,
          batch_number: it.batchNumber,
          quantity: it.qty,
          purchase_price: it.price,
          subtotal: Math.round(it.qty * it.price * 100) / 100,
          expiry_date: it.exp,
          created_at: new Date(dp.createdAt).toISOString(),
        });
      }
      console.log(`  + Created demo PO: ${dp.poNumber} (${dp.supplierName}) - ₹${totalAmt}`);
    }
  } else {
    console.log(`  ✓ Sufficient purchase orders already exist (${purchaseCount} POs found).`);
  }

  console.log('\n==================================================');
  console.log('✅ Realistic Pharmacy Demo Data Seeding Complete!');
  console.log('==================================================');
}

// Execute if run directly
if (process.argv[1]?.endsWith('seedRealisticPharmacyData.ts') || process.argv[1]?.endsWith('seedRealisticPharmacyData.js')) {
  seedRealisticData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error during seeding:', err);
      process.exit(1);
    });
}
