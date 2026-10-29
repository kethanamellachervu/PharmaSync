import { getSupabaseClient, testSupabaseConnection, withDbTimeout, DEFAULT_DB_TIMEOUT_MS } from '../config/supabase.js';
import {
  Medicine,
  MedicineBatch,
  MedicineWithBatches,
  StockMovement,
  Supplier,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  FefoAllocationResult,
  ShopSettings,
  ConfirmBillInput,
  ConfirmBillResult,
} from '../types/pharmacy.js';
import { ForecastSettings, ReviewStatus } from './forecastingService.js';
import { inMemoryStore } from './inMemoryStore.js';

export interface SupabaseReviewRecord {
  status: ReviewStatus;
  suggestedQuantity: number;
  adjustedQuantity?: number;
  reviewerNotes?: string;
  reviewedAt?: string;
}

function mapMedicine(row: any): Medicine {
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name || undefined,
    category: row.category,
    manufacturer: row.manufacturer || undefined,
    description: row.description || undefined,
    unit: row.unit,
    minStockLevel: Number(row.min_stock_level),
    sellingPrice: Number(row.selling_price),
    purchasePrice: row.purchase_price !== null && row.purchase_price !== undefined ? Number(row.purchase_price) : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapBatch(row: any): MedicineBatch {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    batchNumber: row.batch_number,
    quantity: Number(row.quantity),
    mfgDate: row.mfg_date ? (typeof row.mfg_date === 'string' ? row.mfg_date.split('T')[0] : row.mfg_date.toISOString().split('T')[0]) : undefined,
    expiryDate: typeof row.expiry_date === 'string' ? row.expiry_date.split('T')[0] : row.expiry_date.toISOString().split('T')[0],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function enrichMedicine(
  med: Medicine,
  batches: MedicineBatch[],
  nearExpiryDays: number
): MedicineWithBatches {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thresholdDate = new Date(today);
  thresholdDate.setDate(today.getDate() + nearExpiryDays);

  let usableStock = 0;
  let expiredStock = 0;
  let hasNearExpiry = false;
  let earliestExpiry: string | null = null;

  const sortedBatches = [...batches].sort((a, b) => {
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  for (const b of sortedBatches) {
    const exp = new Date(b.expiryDate);
    exp.setHours(0, 0, 0, 0);

    if (exp < today) {
      expiredStock += b.quantity;
    } else {
      usableStock += b.quantity;
      if (b.quantity > 0) {
        if (!earliestExpiry || exp.getTime() < new Date(earliestExpiry).getTime()) {
          earliestExpiry = b.expiryDate;
        }
        if (exp <= thresholdDate) {
          hasNearExpiry = true;
        }
      }
    }
  }

  const isOutOfStock = usableStock === 0;
  const isLowStock = usableStock > 0 && usableStock <= med.minStockLevel;
  const isExpired = expiredStock > 0;
  const isNearExpiry = hasNearExpiry;

  let stockStatus: 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Expired' | 'Out of Stock' = 'In Stock';
  if (isOutOfStock) {
    stockStatus = 'Out of Stock';
  } else if (isNearExpiry) {
    stockStatus = 'Near Expiry';
  } else if (isLowStock) {
    stockStatus = 'Low Stock';
  }

  return {
    ...med,
    batches: sortedBatches,
    usableStock,
    expiredStock,
    totalStock: usableStock,
    totalPhysicalStock: usableStock + expiredStock,
    isLowStock,
    isNearExpiry,
    isExpired,
    isOutOfStock,
    stockStatus,
    earliestExpiry,
  };
}

export class SupabaseService {
  private getClient() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client is not configured or initialized.');
    }
    return client;
  }

  public async getStatus() {
    return testSupabaseConnection();
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------
  public async getShopSettings(): Promise<ShopSettings> {
    const client = this.getClient();
    let data: any[] | null = null;
    try {
      const res = await withDbTimeout(
        client
          .from('shop_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1),
        DEFAULT_DB_TIMEOUT_MS,
        'getShopSettings'
      );
      data = res.data;
    } catch {
      data = null;
    }

    if (!data || data.length === 0) {
      // Default shop settings
      return {
        shopName: 'Sri Sai Medical & General Store',
        pharmacistName: 'Store Pharmacist',
        nearExpiryDays: 30,
      };
    }

    const row = data[0];
    return {
      shopName: row.shop_name,
      pharmacistName: row.pharmacist_name,
      nearExpiryDays: Number(row.near_expiry_days),
    };
  }

  public async updateShopSettings(newSettings: Partial<ShopSettings>): Promise<ShopSettings> {
    const client = this.getClient();
    const current = await this.getShopSettings();
    const updated = {
      shop_name: newSettings.shopName !== undefined ? newSettings.shopName.trim() : current.shopName,
      pharmacist_name: newSettings.pharmacistName !== undefined ? newSettings.pharmacistName.trim() : current.pharmacistName,
      near_expiry_days: newSettings.nearExpiryDays !== undefined ? Number(newSettings.nearExpiryDays) : current.nearExpiryDays,
      updated_at: new Date().toISOString(),
    };

    // Upsert or update
    const { data: existing } = await client.from('shop_settings').select('id').limit(1);
    if (existing && existing.length > 0) {
      await client.from('shop_settings').update(updated).eq('id', existing[0].id);
    } else {
      await client.from('shop_settings').insert(updated);
    }

    return {
      shopName: updated.shop_name,
      pharmacistName: updated.pharmacist_name,
      nearExpiryDays: updated.near_expiry_days,
    };
  }

  // ---------------------------------------------------------------------------
  // MEDICINES & BATCHES
  // ---------------------------------------------------------------------------
  /**
   * Lightweight catalog query specifically for OCR and bill validation.
   * Fetches only master medicine product info without joining batches.
   */
  public async getCatalogMedicines(): Promise<Medicine[]> {
    const client = this.getClient();
    const t0 = Date.now();
    const { data, error } = await withDbTimeout(
      client
        .from('medicines')
        .select('id, name, generic_name, category, manufacturer, description, unit, min_stock_level, purchase_price, selling_price, created_at, updated_at')
        .order('name', { ascending: true }),
      DEFAULT_DB_TIMEOUT_MS,
      'Fetch catalog medicines'
    );

    if (error) throw new Error(`Supabase query error: ${error.message}`);
    const duration = Date.now() - t0;
    console.log(`[CatalogValidation] Fetched ${data?.length || 0} catalog medicines from Supabase in ${duration}ms`);
    return (data || []).map(mapMedicine);
  }

  public async getAllMedicines(): Promise<MedicineWithBatches[]> {
    const client = this.getClient();
    const settings = await this.getShopSettings();

    const [medRes, batchRes] = await withDbTimeout(
      Promise.all([
        client.from('medicines').select('*').order('name', { ascending: true }),
        client.from('medicine_batches').select('*').order('expiry_date', { ascending: true }),
      ]),
      DEFAULT_DB_TIMEOUT_MS,
      'getAllMedicines'
    );

    if (medRes.error) throw new Error(`Supabase query error: ${medRes.error.message}`);
    if (batchRes.error) throw new Error(`Supabase query error: ${batchRes.error.message}`);

    const batchesByMedId = new Map<string, MedicineBatch[]>();
    for (const bRow of batchRes.data || []) {
      const b = mapBatch(bRow);
      if (!batchesByMedId.has(b.medicineId)) {
        batchesByMedId.set(b.medicineId, []);
      }
      batchesByMedId.get(b.medicineId)!.push(b);
    }

    return (medRes.data || []).map((row) => {
      const med = mapMedicine(row);
      const batches = batchesByMedId.get(med.id) || [];
      return enrichMedicine(med, batches, settings.nearExpiryDays);
    });
  }

  public async getMedicineById(id: string): Promise<MedicineWithBatches | null> {
    const client = this.getClient();
    const settings = await this.getShopSettings();

    const [medRes, batchRes] = await Promise.all([
      client.from('medicines').select('*').eq('id', id).maybeSingle(),
      client.from('medicine_batches').select('*').eq('medicine_id', id).order('expiry_date', { ascending: true }),
    ]);

    if (medRes.error || !medRes.data) return null;
    const med = mapMedicine(medRes.data);
    const batches = (batchRes.data || []).map(mapBatch);
    return enrichMedicine(med, batches, settings.nearExpiryDays);
  }

  public async addMedicine(data: {
    name: string;
    genericName?: string;
    category: string;
    manufacturer?: string;
    description?: string;
    unit: string;
    minStockLevel: number;
    sellingPrice: number;
    purchasePrice?: number;
    batchNumber: string;
    quantity: number;
    mfgDate?: string;
    expiryDate: string;
  }): Promise<MedicineWithBatches> {
    const client = this.getClient();

    // 0. Check for duplicate medicine name (case-insensitive)
    const cleanName = data.name.trim();
    const { data: existingMed } = await client
      .from('medicines')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingMed) {
      throw new Error(`A medicine named "${existingMed.name}" already exists in the inventory (ID: ${existingMed.id}). Please replenish stock by adding a batch instead of duplicating the medicine.`);
    }

    // 1. Insert medicine
    const { data: medRow, error: medErr } = await client
      .from('medicines')
      .insert({
        name: cleanName,
        generic_name: data.genericName?.trim() || null,
        category: data.category.trim(),
        manufacturer: data.manufacturer?.trim() || null,
        description: data.description?.trim() || null,
        unit: data.unit.trim().toLowerCase(),
        min_stock_level: data.minStockLevel,
        selling_price: data.sellingPrice,
        purchase_price: data.purchasePrice !== undefined ? data.purchasePrice : null,
      })
      .select()
      .single();

    if (medErr || !medRow) {
      throw new Error(`Failed to add medicine: ${medErr?.message}`);
    }

    // 2. Insert initial batch
    const { data: batchRow, error: batchErr } = await client
      .from('medicine_batches')
      .insert({
        medicine_id: medRow.id,
        batch_number: data.batchNumber.trim().toUpperCase(),
        quantity: data.quantity,
        mfg_date: data.mfgDate || null,
        expiry_date: data.expiryDate,
      })
      .select()
      .single();

    if (batchErr || !batchRow) {
      throw new Error(`Failed to add initial batch: ${batchErr?.message}`);
    }

    // 3. Insert stock movement audit log
    await client.from('stock_movements').insert({
      medicine_id: medRow.id,
      batch_id: batchRow.id,
      batch_number: data.batchNumber.trim().toUpperCase(),
      movement_type: 'Stock Added',
      quantity: data.quantity,
      reason: 'Initial stock entry with medicine creation',
    });

    const med = mapMedicine(medRow);
    const batch = mapBatch(batchRow);
    return enrichMedicine(med, [batch], 30);
  }

  public async updateMedicine(
    id: string,
    data: {
      name?: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      description?: string;
      unit?: string;
      minStockLevel?: number;
      sellingPrice?: number;
      purchasePrice?: number;
    }
  ): Promise<MedicineWithBatches | null> {
    const client = this.getClient();
    const updatePayload: any = { updated_at: new Date().toISOString() };

    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      const { data: existing } = await client
        .from('medicines')
        .select('id, name')
        .ilike('name', cleanName)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error(`Another medicine named "${existing.name}" already exists in the inventory (ID: ${existing.id}).`);
      }
      updatePayload.name = cleanName;
    }
    if (data.genericName !== undefined) updatePayload.generic_name = data.genericName ? data.genericName.trim() : null;
    if (data.category !== undefined) updatePayload.category = data.category.trim();
    if (data.manufacturer !== undefined) updatePayload.manufacturer = data.manufacturer ? data.manufacturer.trim() : null;
    if (data.description !== undefined) updatePayload.description = data.description ? data.description.trim() : null;
    if (data.unit !== undefined) updatePayload.unit = data.unit.trim().toLowerCase();
    if (data.minStockLevel !== undefined) updatePayload.min_stock_level = Number(data.minStockLevel);
    if (data.sellingPrice !== undefined) updatePayload.selling_price = Number(data.sellingPrice);
    if (data.purchasePrice !== undefined) updatePayload.purchase_price = data.purchasePrice !== null ? Number(data.purchasePrice) : null;

    const { error } = await client.from('medicines').update(updatePayload).eq('id', id);
    if (error) throw new Error(`Failed to update medicine: ${error.message}`);

    return this.getMedicineById(id);
  }

  public async deleteMedicine(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('medicines').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete medicine: ${error.message}`);
    return true;
  }

  public async getBatches(medicineId: string): Promise<MedicineBatch[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('medicine_batches')
      .select('*')
      .eq('medicine_id', medicineId)
      .order('expiry_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch batches: ${error.message}`);
    return (data || []).map(mapBatch);
  }

  public async addBatch(
    medicineId: string,
    data: {
      batchNumber: string;
      quantity: number;
      mfgDate?: string;
      expiryDate: string;
      reason?: string;
    }
  ): Promise<MedicineBatch> {
    const client = this.getClient();
    const batchNum = data.batchNumber.trim().toUpperCase();

    // Check if batch number already exists for this medicine
    const { data: existing } = await client
      .from('medicine_batches')
      .select('*')
      .eq('medicine_id', medicineId)
      .eq('batch_number', batchNum)
      .maybeSingle();

    let batchRow: any;
    if (existing) {
      const { data: updated, error } = await client
        .from('medicine_batches')
        .update({
          quantity: Number(existing.quantity) + Number(data.quantity),
          expiry_date: data.expiryDate,
          mfg_date: data.mfgDate || existing.mfg_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update batch: ${error.message}`);
      batchRow = updated;
    } else {
      const { data: inserted, error } = await client
        .from('medicine_batches')
        .insert({
          medicine_id: medicineId,
          batch_number: batchNum,
          quantity: data.quantity,
          mfg_date: data.mfgDate || null,
          expiry_date: data.expiryDate,
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to insert batch: ${error.message}`);
      batchRow = inserted;
    }

    // Stock movement audit
    await client.from('stock_movements').insert({
      medicine_id: medicineId,
      batch_id: batchRow.id,
      batch_number: batchNum,
      movement_type: 'Stock Added',
      quantity: data.quantity,
      reason: data.reason || 'Manual batch addition',
    });

    return mapBatch(batchRow);
  }

  public async updateBatch(
    medicineId: string,
    batchId: string,
    data: {
      batchNumber?: string;
      quantity?: number;
      mfgDate?: string;
      expiryDate?: string;
      reason?: string;
    }
  ): Promise<MedicineBatch | null> {
    const client = this.getClient();

    const { data: current, error: getErr } = await client
      .from('medicine_batches')
      .select('*')
      .eq('id', batchId)
      .eq('medicine_id', medicineId)
      .maybeSingle();

    if (getErr || !current) return null;

    const diff = data.quantity !== undefined ? data.quantity - current.quantity : 0;
    const updatePayload: any = { updated_at: new Date().toISOString() };

    if (data.batchNumber !== undefined) updatePayload.batch_number = data.batchNumber.trim().toUpperCase();
    if (data.quantity !== undefined) updatePayload.quantity = Number(data.quantity);
    if (data.mfgDate !== undefined) updatePayload.mfg_date = data.mfgDate || null;
    if (data.expiryDate !== undefined) updatePayload.expiry_date = data.expiryDate;

    const { data: updated, error } = await client
      .from('medicine_batches')
      .update(updatePayload)
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update batch: ${error.message}`);

    if (diff !== 0) {
      await client.from('stock_movements').insert({
        medicine_id: medicineId,
        batch_id: batchId,
        batch_number: updated.batch_number,
        movement_type: 'Adjustment',
        quantity: diff,
        reason: data.reason || `Manual quantity adjustment (${diff > 0 ? '+' : ''}${diff})`,
      });
    }

    return mapBatch(updated);
  }

  public async getStockMovements(
    medicineId?: string,
    limit = 50
  ): Promise<(StockMovement & { medicineName: string })[]> {
    const client = this.getClient();
    let query = client
      .from('stock_movements')
      .select('*, medicines(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (medicineId) {
      query = query.eq('medicine_id', medicineId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch stock movements: ${error.message}`);

    return (data || []).map((row: any) => ({
      id: row.id,
      medicineId: row.medicine_id,
      medicineName: row.medicines?.name || 'Unknown',
      batchId: row.batch_id || undefined,
      batchNumber: row.batch_number,
      movementType: row.movement_type,
      quantity: Number(row.quantity),
      reason: row.reason || undefined,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // FEFO STOCK ALLOCATION (First-Expiry-First-Out)
  // ---------------------------------------------------------------------------
  public async allocateFefo(
    medicineId: string,
    requestedQuantity: number,
    reason = 'Dispensed / Sold'
  ): Promise<FefoAllocationResult> {
    const client = this.getClient();

    const { data: med, error: medErr } = await client
      .from('medicines')
      .select('name, unit')
      .eq('id', medicineId)
      .maybeSingle();

    if (medErr || !med) {
      return {
        success: false,
        medicineId,
        medicineName: 'Unknown',
        requestedQuantity,
        allocatedBatches: [],
        usableStockRemaining: 0,
        error: 'Medicine not found.',
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch usable batches ordered by expiry_date ASC (FEFO)
    const { data: batches, error: batchErr } = await client
      .from('medicine_batches')
      .select('*')
      .eq('medicine_id', medicineId)
      .gt('quantity', 0)
      .gte('expiry_date', todayStr)
      .order('expiry_date', { ascending: true });

    if (batchErr) throw new Error(`FEFO fetch error: ${batchErr.message}`);

    const usableBatches = (batches || []).map(mapBatch);
    const totalUsable = usableBatches.reduce((sum, b) => sum + b.quantity, 0);

    if (totalUsable < requestedQuantity) {
      return {
        success: false,
        medicineId,
        medicineName: med.name,
        requestedQuantity,
        allocatedBatches: [],
        usableStockRemaining: totalUsable,
        error: `Insufficient usable stock for "${med.name}". Usable: ${totalUsable} ${med.unit}, Requested: ${requestedQuantity} ${med.unit}`,
      };
    }

    let remainingToDeduct = requestedQuantity;
    const allocatedBatches: {
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
    }[] = [];

    for (const b of usableBatches) {
      if (remainingToDeduct <= 0) break;
      const deduct = Math.min(b.quantity, remainingToDeduct);

      // Deduct from batch
      await client
        .from('medicine_batches')
        .update({
          quantity: b.quantity - deduct,
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.id);

      // Record movement
      await client.from('stock_movements').insert({
        medicine_id: medicineId,
        batch_id: b.id,
        batch_number: b.batchNumber,
        movement_type: 'Stock Removed',
        quantity: -deduct,
        reason: `${reason} (FEFO batch ${b.batchNumber})`,
      });

      allocatedBatches.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        quantity: deduct,
        expiryDate: b.expiryDate,
      });

      remainingToDeduct -= deduct;
    }

    return {
      success: true,
      medicineId,
      medicineName: med.name,
      requestedQuantity,
      allocatedBatches,
      usableStockRemaining: totalUsable - requestedQuantity,
    };
  }

  // ---------------------------------------------------------------------------
  // SUPPLIERS
  // ---------------------------------------------------------------------------
  private enrichSupplierRow(r: any, purchases: any[]): Supplier {
    const suppPurchases = purchases.filter((p) => p.supplier_id === r.id);
    const totalPurchases = suppPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const lastPurchaseDate = suppPurchases.length > 0 ? new Date(suppPurchases[0].created_at).toISOString() : null;

    const telanganaSuppliersData: Record<string, Partial<Supplier>> = {
      'Deccan Pharma Distributors': {
        city: 'Hyderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500037',
        productCategories: ['Analgesics', 'Antipyretics', 'Cardiovascular', 'Gastrointestinal'],
        medicinesSupplied: ['Paracetamol 500mg Tablets', 'Dolo 650mg Tablets', 'Pantoprazole 40mg Tablets'],
        paymentTerms: 'Net 30 Days',
        deliveryTime: '24-48 Hours',
        minOrderAmount: 3000,
        rating: 4.9,
        isDemo: true,
      },
      'Telangana MedSupply': {
        city: 'Secunderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500003',
        productCategories: ['Antibiotics', 'Respiratory', 'Pediatric Formulations'],
        medicinesSupplied: ['Amoxicillin 500mg Capsules', 'Montair 10mg Tablets'],
        paymentTerms: 'Net 15 Days',
        deliveryTime: 'Same Day (Hyd/Sec)',
        minOrderAmount: 2500,
        rating: 4.8,
        isDemo: true,
      },
      'Charminar Medical Agencies': {
        city: 'Hyderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500095',
        productCategories: ['Generics', 'Vitamins & Supplements', 'OTC Medicines'],
        medicinesSupplied: ['Vitamin C 500mg Chewable', 'Becosules Capsules', 'Digene Chewable Antacid Tablets'],
        paymentTerms: 'Immediate UPI/Cash',
        deliveryTime: '24 Hours',
        minOrderAmount: 1500,
        rating: 4.7,
        isDemo: true,
      },
      'Medchal Healthcare Distributors': {
        city: 'Medchal',
        district: 'Medchal-Malkajgiri',
        state: 'Telangana',
        pincode: '501401',
        productCategories: ['Antibiotics', 'IV Fluids', 'Surgical & Bandages'],
        medicinesSupplied: ['Amoxicillin 500mg Capsules', 'Azithromycin 500mg Tablets'],
        paymentTerms: 'Net 30 Days',
        deliveryTime: '24-48 Hours',
        minOrderAmount: 5000,
        rating: 4.8,
        isDemo: true,
      },
      'Warangal Pharma Wholesale': {
        city: 'Warangal',
        district: 'Warangal Urban',
        state: 'Telangana',
        pincode: '506009',
        productCategories: ['Antidiabetic', 'Cardiovascular', 'Analgesics'],
        medicinesSupplied: ['Metformin 500mg Tablets', 'Ibuprofen 400mg Tablets'],
        paymentTerms: 'Net 21 Days',
        deliveryTime: '48 Hours',
        minOrderAmount: 4000,
        rating: 4.6,
        isDemo: true,
      },
      'Nizamabad Medical Distributors': {
        city: 'Nizamabad',
        district: 'Nizamabad',
        state: 'Telangana',
        pincode: '503001',
        productCategories: ['Oral Rehydration', 'Antihistamines', 'Antibiotics'],
        medicinesSupplied: ['ORS Sachets (Electral)', 'Cetirizine 10mg Tablets'],
        paymentTerms: 'Net 15 Days',
        deliveryTime: '48-72 Hours',
        minOrderAmount: 3000,
        rating: 4.5,
        isDemo: true,
      },
      'Karimnagar Pharma Traders': {
        city: 'Karimnagar',
        district: 'Karimnagar',
        state: 'Telangana',
        pincode: '505001',
        productCategories: ['Mineral Supplements', 'Vitamins', 'Cough Preparations'],
        medicinesSupplied: ['Shelcal 500mg Tablets', 'Ascoril D Plus Cough Syrup 100ml'],
        paymentTerms: 'Net 30 Days',
        deliveryTime: '48 Hours',
        minOrderAmount: 3500,
        rating: 4.7,
        isDemo: true,
      },
      'Hyderabad Generic Medicine Suppliers': {
        city: 'Hyderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500018',
        productCategories: ['Generics', 'Jan Aushadhi Equivalents', 'Chronic Care'],
        medicinesSupplied: ['Cetirizine 10mg Tablets', 'Omez 20mg Capsules'],
        paymentTerms: 'Immediate UPI/Cash',
        deliveryTime: 'Same Day (Hyderabad)',
        minOrderAmount: 2000,
        rating: 4.9,
        isDemo: true,
      },
      'Rangareddy Healthcare Supplies': {
        city: 'Shamshabad',
        district: 'Rangareddy',
        state: 'Telangana',
        pincode: '501218',
        productCategories: ['Emergency Care', 'Critical Antibiotics', 'Cardiovascular'],
        medicinesSupplied: ['Atorva 10mg Tablets', 'Telma 40mg Tablets'],
        paymentTerms: 'Net 30 Days',
        deliveryTime: '24 Hours',
        minOrderAmount: 5000,
        rating: 4.8,
        isDemo: true,
      },
      'South Telangana Pharma Agencies': {
        city: 'Mahabubnagar',
        district: 'Mahabubnagar',
        state: 'Telangana',
        pincode: '509001',
        productCategories: ['General Pharmaceuticals', 'Syrups & Suspensions'],
        medicinesSupplied: ['Ascoril D Plus Cough Syrup 100ml', 'Paracetamol 500mg Tablets'],
        paymentTerms: 'Net 15 Days',
        deliveryTime: '48-72 Hours',
        minOrderAmount: 2500,
        rating: 4.6,
        isDemo: true,
      },
    };

    const known = telanganaSuppliersData[r.name] || {};
    let city = known.city || 'Hyderabad';
    let district = known.district || 'Hyderabad';
    let pincode = known.pincode || '500001';

    if (r.address) {
      const pinMatch = r.address.match(/\b\d{6}\b/);
      if (pinMatch) pincode = pinMatch[0];
      const cities = ['Secunderabad', 'Medchal', 'Warangal', 'Nizamabad', 'Karimnagar', 'Shamshabad', 'Mahabubnagar', 'Hyderabad'];
      for (const c of cities) {
        if (r.address.toLowerCase().includes(c.toLowerCase())) {
          city = c;
          if (c === 'Medchal') district = 'Medchal-Malkajgiri';
          else if (c === 'Warangal') district = 'Warangal Urban';
          else if (c === 'Shamshabad') district = 'Rangareddy';
          else if (c === 'Secunderabad') district = 'Hyderabad';
          else district = c;
          break;
        }
      }
    }

    return {
      id: r.id,
      name: r.name,
      contactPerson: r.contact_person || undefined,
      phone: r.phone,
      email: r.email || undefined,
      address: r.address || undefined,
      city,
      district,
      state: 'Telangana',
      pincode,
      productCategories: known.productCategories || ['General Pharmaceuticals', 'OTC Medicines'],
      medicinesSupplied: known.medicinesSupplied || [],
      paymentTerms: known.paymentTerms || 'Net 30 Days',
      deliveryTime: known.deliveryTime || '24-48 Hours',
      minOrderAmount: known.minOrderAmount || 3000,
      status: (r.status as 'Active' | 'Inactive') || 'Active',
      totalPurchases: Math.round(totalPurchases * 100) / 100,
      lastPurchaseDate,
      rating: known.rating || 4.7,
      isDemo: true,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  /**
   * Lightweight supplier query specifically for OCR and bill matching.
   * Avoids pulling all purchase records to calculate statistics.
   */
  public async getCatalogSuppliers(): Promise<Supplier[]> {
    const client = this.getClient();
    const t0 = Date.now();
    const { data, error } = await withDbTimeout(
      client.from('suppliers').select('id, name, phone, email, address, created_at, updated_at').order('name', { ascending: true }),
      DEFAULT_DB_TIMEOUT_MS,
      'Fetch catalog suppliers'
    );

    if (error) throw new Error(`Failed to fetch catalog suppliers: ${error.message}`);
    const duration = Date.now() - t0;
    console.log(`[CatalogValidation] Fetched ${data?.length || 0} catalog suppliers from Supabase in ${duration}ms`);
    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      email: r.email || undefined,
      address: r.address || undefined,
      status: 'Active',
      totalPurchases: 0,
      rating: 4.5,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  public async getAllSuppliers(search?: string): Promise<Supplier[]> {
    const client = this.getClient();
    let query = client.from('suppliers').select('*').order('name', { ascending: true });

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(`name.ilike.${q},contact_person.ilike.${q},phone.ilike.${q},email.ilike.${q}`);
    }

    const [suppRes, purchRes] = await withDbTimeout(
      Promise.all([
        query,
        client.from('purchases').select('id, supplier_id, total_amount, created_at').order('created_at', { ascending: false }),
      ]),
      DEFAULT_DB_TIMEOUT_MS,
      'getAllSuppliers'
    );

    if (suppRes.error) throw new Error(`Failed to fetch suppliers: ${suppRes.error.message}`);
    const purchases = purchRes.data || [];

    return (suppRes.data || []).map((r) => this.enrichSupplierRow(r, purchases));
  }

  public async getSupplierById(id: string): Promise<Supplier | null> {
    const client = this.getClient();
    const [suppRes, purchRes] = await Promise.all([
      client.from('suppliers').select('*').eq('id', id).maybeSingle(),
      client.from('purchases').select('id, supplier_id, total_amount, created_at').eq('supplier_id', id).order('created_at', { ascending: false }),
    ]);

    if (suppRes.error || !suppRes.data) return null;
    const purchases = purchRes.data || [];
    return this.enrichSupplierRow(suppRes.data, purchases);
  }

  public async addSupplier(data: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> {
    const client = this.getClient();
    const { data: inserted, error } = await client
      .from('suppliers')
      .insert({
        name: data.name.trim(),
        contact_person: data.contactPerson?.trim() || null,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
      })
      .select()
      .single();

    if (error || !inserted) throw new Error(`Failed to add supplier: ${error?.message}`);

    return {
      id: inserted.id,
      name: inserted.name,
      contactPerson: inserted.contact_person || undefined,
      phone: inserted.phone,
      email: inserted.email || undefined,
      address: inserted.address || undefined,
      createdAt: new Date(inserted.created_at).toISOString(),
      updatedAt: new Date(inserted.updated_at).toISOString(),
    };
  }

  public async updateSupplier(
    id: string,
    data: {
      name?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
    }
  ): Promise<Supplier | null> {
    const client = this.getClient();
    const updatePayload: any = { updated_at: new Date().toISOString() };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.contactPerson !== undefined) updatePayload.contact_person = data.contactPerson ? data.contactPerson.trim() : null;
    if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
    if (data.email !== undefined) updatePayload.email = data.email ? data.email.trim() : null;
    if (data.address !== undefined) updatePayload.address = data.address ? data.address.trim() : null;

    const { data: updated, error } = await client
      .from('suppliers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) return null;

    return {
      id: updated.id,
      name: updated.name,
      contactPerson: updated.contact_person || undefined,
      phone: updated.phone,
      email: updated.email || undefined,
      address: updated.address || undefined,
      createdAt: new Date(updated.created_at).toISOString(),
      updatedAt: new Date(updated.updated_at).toISOString(),
    };
  }

  public async deleteSupplier(id: string): Promise<boolean> {
    const client = this.getClient();
    const { data: purchases } = await client.from('purchases').select('id').eq('supplier_id', id).limit(1);
    if (purchases && purchases.length > 0) {
      throw new Error('Cannot delete supplier with associated purchase orders.');
    }

    const { error } = await client.from('suppliers').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete supplier: ${error.message}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // PURCHASES
  // ---------------------------------------------------------------------------
  public async getAllPurchases(filter?: { supplierId?: string; date?: string }): Promise<Purchase[]> {
    const client = this.getClient();
    let query = client
      .from('purchases')
      .select('*, suppliers(name), purchase_items(*, medicines(name))')
      .order('created_at', { ascending: false });

    if (filter?.supplierId) query = query.eq('supplier_id', filter.supplierId);
    if (filter?.date) query = query.gte('created_at', `${filter.date}T00:00:00.000Z`).lte('created_at', `${filter.date}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch purchases: ${error.message}`);

    return (data || []).map((r: any) => ({
      id: r.id,
      purchaseNumber: r.purchase_number,
      supplierId: r.supplier_id,
      supplierName: r.suppliers?.name || 'Unknown',
      items: (r.purchase_items || []).map((iRow: any) => ({
        id: iRow.id,
        purchaseId: iRow.purchase_id,
        medicineId: iRow.medicine_id,
        medicineName: iRow.medicines?.name || 'Unknown',
        batchId: iRow.batch_id || undefined,
        batchNumber: iRow.batch_number,
        quantity: Number(iRow.quantity),
        purchasePrice: Number(iRow.purchase_price),
        subtotal: Number(iRow.subtotal),
        expiryDate: iRow.expiry_date,
        mfgDate: iRow.mfg_date || undefined,
      })),
      totalQuantity: Number(r.total_quantity),
      totalAmount: Number(r.total_amount),
      notes: r.notes || undefined,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  public async getPurchaseById(id: string): Promise<Purchase | null> {
    const client = this.getClient();
    const { data: r, error } = await client
      .from('purchases')
      .select('*, suppliers(name), purchase_items(*, medicines(name))')
      .or(`id.eq.${id},purchase_number.eq.${id}`)
      .maybeSingle();

    if (error || !r) return null;

    return {
      id: r.id,
      purchaseNumber: r.purchase_number,
      supplierId: r.supplier_id,
      supplierName: r.suppliers?.name || 'Unknown',
      items: (r.purchase_items || []).map((iRow: any) => ({
        id: iRow.id,
        purchaseId: iRow.purchase_id,
        medicineId: iRow.medicine_id,
        medicineName: iRow.medicines?.name || 'Unknown',
        batchId: iRow.batch_id || undefined,
        batchNumber: iRow.batch_number,
        quantity: Number(iRow.quantity),
        purchasePrice: Number(iRow.purchase_price),
        subtotal: Number(iRow.subtotal),
        expiryDate: iRow.expiry_date,
        mfgDate: iRow.mfg_date || undefined,
      })),
      totalQuantity: Number(r.total_quantity),
      totalAmount: Number(r.total_amount),
      notes: r.notes || undefined,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  public async createPurchase(data: {
    supplierId: string;
    items: {
      medicineId: string;
      batchNumber: string;
      quantity: number;
      purchasePrice: number;
      expiryDate: string;
      mfgDate?: string;
    }[];
    notes?: string;
  }): Promise<Purchase> {
    const client = this.getClient();

    const { data: supplier, error: suppErr } = await client
      .from('suppliers')
      .select('name')
      .eq('id', data.supplierId)
      .single();

    if (suppErr || !supplier) throw new Error('Supplier not found.');

    const { count } = await client.from('purchases').select('*', { count: 'exact', head: true });
    const poNumber = `PO-${1001 + (count || 0)}`;

    let totalQuantity = 0;
    let totalAmount = 0;
    for (const item of data.items) {
      totalQuantity += Number(item.quantity);
      totalAmount += Number(item.quantity) * Number(item.purchasePrice);
    }

    const { data: poRow, error: poErr } = await client
      .from('purchases')
      .insert({
        purchase_number: poNumber,
        supplier_id: data.supplierId,
        total_quantity: totalQuantity,
        total_amount: totalAmount,
        notes: data.notes?.trim() || null,
      })
      .select()
      .single();

    if (poErr || !poRow) throw new Error(`Failed to create purchase: ${poErr?.message}`);

    const insertedItems: PurchaseItem[] = [];

    for (const item of data.items) {
      const batchNum = item.batchNumber.trim().toUpperCase();
      const subtotal = Number(item.quantity) * Number(item.purchasePrice);

      const { data: med } = await client.from('medicines').select('name').eq('id', item.medicineId).single();

      // Upsert batch
      const { data: existingBatch } = await client
        .from('medicine_batches')
        .select('*')
        .eq('medicine_id', item.medicineId)
        .eq('batch_number', batchNum)
        .maybeSingle();

      let batchId: string;
      if (existingBatch) {
        batchId = existingBatch.id;
        await client
          .from('medicine_batches')
          .update({
            quantity: Number(existingBatch.quantity) + Number(item.quantity),
            expiry_date: item.expiryDate,
            mfg_date: item.mfgDate || existingBatch.mfg_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', batchId);
      } else {
        const { data: newBatch } = await client
          .from('medicine_batches')
          .insert({
            medicine_id: item.medicineId,
            batch_number: batchNum,
            quantity: item.quantity,
            mfg_date: item.mfgDate || null,
            expiry_date: item.expiryDate,
          })
          .select()
          .single();
        batchId = newBatch.id;
      }

      const { data: piRow } = await client
        .from('purchase_items')
        .insert({
          purchase_id: poRow.id,
          medicine_id: item.medicineId,
          batch_id: batchId,
          batch_number: batchNum,
          quantity: item.quantity,
          purchase_price: item.purchasePrice,
          subtotal,
          expiry_date: item.expiryDate,
          mfg_date: item.mfgDate || null,
        })
        .select()
        .single();

      // Movement audit
      await client.from('stock_movements').insert({
        medicine_id: item.medicineId,
        batch_id: batchId,
        batch_number: batchNum,
        movement_type: 'Stock Added',
        quantity: item.quantity,
        reason: `Inward purchase delivery #${poNumber} from ${supplier.name}`,
      });

      insertedItems.push({
        id: piRow.id,
        purchaseId: poRow.id,
        medicineId: item.medicineId,
        medicineName: med?.name || 'Unknown',
        batchId,
        batchNumber: batchNum,
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),
        subtotal,
        expiryDate: item.expiryDate,
        mfgDate: item.mfgDate,
      });
    }

    return {
      id: poRow.id,
      purchaseNumber: poNumber,
      supplierId: poRow.supplier_id,
      supplierName: supplier.name,
      items: insertedItems,
      totalQuantity,
      totalAmount,
      notes: poRow.notes || undefined,
      createdAt: new Date(poRow.created_at).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // SALES (FEFO DEDUCTION)
  // ---------------------------------------------------------------------------
  public async getAllSales(filter?: { search?: string; date?: string }): Promise<Sale[]> {
    const client = this.getClient();
    let query = client
      .from('sales')
      .select('*, sale_items(*, sale_batch_allocations(*))')
      .order('created_at', { ascending: false });

    if (filter?.search && filter.search.trim()) {
      const q = `%${filter.search.trim()}%`;
      query = query.or(`sale_number.ilike.${q},customer_name.ilike.${q}`);
    }
    if (filter?.date) {
      query = query.gte('created_at', `${filter.date}T00:00:00.000Z`).lte('created_at', `${filter.date}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch sales: ${error.message}`);

    return (data || []).map((r: any) => {
      const items: SaleItem[] = (r.sale_items || []).map((iRow: any) => ({
        id: iRow.id,
        saleId: iRow.sale_id,
        medicineId: iRow.medicine_id,
        medicineName: iRow.medicine_name,
        unit: iRow.unit,
        quantity: Number(iRow.quantity),
        unitPrice: Number(iRow.unit_price),
        subtotal: Number(iRow.subtotal),
        batchAllocations: (iRow.sale_batch_allocations || []).map((a: any) => ({
          batchId: a.batch_id,
          batchNumber: a.batch_number,
          quantity: Number(a.quantity),
          expiryDate: a.expiry_date,
        })),
      }));

      const firstItem = items[0];
      return {
        id: r.id,
        saleNumber: r.sale_number,
        customerName: r.customer_name,
        items,
        totalItems: Number(r.total_items),
        totalQuantity: Number(r.total_quantity),
        totalAmount: Number(r.total_amount),
        idempotencyKey: r.idempotency_key || undefined,
        createdAt: new Date(r.created_at).toISOString(),
        medicineId: firstItem?.medicineId,
        medicineName: firstItem?.medicineName,
        quantity: firstItem?.quantity,
        unitPrice: firstItem?.unitPrice,
        batchesDeducted: firstItem?.batchAllocations,
      };
    });
  }

  public async getSaleById(id: string): Promise<Sale | null> {
    const client = this.getClient();
    const { data: r, error } = await client
      .from('sales')
      .select('*, sale_items(*, sale_batch_allocations(*))')
      .or(`id.eq.${id},sale_number.eq.${id}`)
      .maybeSingle();

    if (error || !r) return null;

    const items: SaleItem[] = (r.sale_items || []).map((iRow: any) => ({
      id: iRow.id,
      saleId: iRow.sale_id,
      medicineId: iRow.medicine_id,
      medicineName: iRow.medicine_name,
      unit: iRow.unit,
      quantity: Number(iRow.quantity),
      unitPrice: Number(iRow.unit_price),
      subtotal: Number(iRow.subtotal),
      batchAllocations: (iRow.sale_batch_allocations || []).map((a: any) => ({
        batchId: a.batch_id,
        batchNumber: a.batch_number,
        quantity: Number(a.quantity),
        expiryDate: a.expiry_date,
      })),
    }));

    const firstItem = items[0];
    return {
      id: r.id,
      saleNumber: r.sale_number,
      customerName: r.customer_name,
      items,
      totalItems: Number(r.total_items),
      totalQuantity: Number(r.total_quantity),
      totalAmount: Number(r.total_amount),
      idempotencyKey: r.idempotency_key || undefined,
      createdAt: new Date(r.created_at).toISOString(),
      medicineId: firstItem?.medicineId,
      medicineName: firstItem?.medicineName,
      quantity: firstItem?.quantity,
      unitPrice: firstItem?.unitPrice,
      batchesDeducted: firstItem?.batchAllocations,
    };
  }

  public async getNextInvoiceNumber(): Promise<string> {
    const client = this.getClient();
    const currentYear = new Date().getFullYear();
    const yearPrefix = `INV-${currentYear}-`;

    const { data: latestSales } = await client
      .from('sales')
      .select('sale_number')
      .ilike('sale_number', `${yearPrefix}%`)
      .order('sale_number', { ascending: false })
      .limit(20);

    let maxSeq = 0;
    if (latestSales && latestSales.length > 0) {
      for (const s of latestSales) {
        if (!s.sale_number) continue;
        const match = s.sale_number.match(new RegExp(`^INV-${currentYear}-(\\d+)$`, 'i'));
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  public async createSale(data: {
    customerName?: string;
    items: {
      medicineId: string;
      quantity: number;
    }[];
    idempotencyKey?: string;
  }): Promise<Sale> {
    const client = this.getClient();

    if (data.idempotencyKey) {
      const { data: existing } = await client
        .from('sales')
        .select('id')
        .eq('idempotency_key', data.idempotencyKey)
        .maybeSingle();
      if (existing) {
        const found = await this.getSaleById(existing.id);
        if (found) return found;
      }
    }

    let totalQuantity = 0;
    let totalAmount = 0;

    const validatedItems: any[] = [];
    for (const item of data.items) {
      const q = Number(item.quantity);
      if (q <= 0) throw new Error('Quantity must be greater than zero.');

      const { data: med, error: medErr } = await client
        .from('medicines')
        .select('*')
        .eq('id', item.medicineId)
        .single();

      if (medErr || !med) throw new Error(`Medicine with ID "${item.medicineId}" not found.`);

      const unitPrice = Number(med.selling_price);
      const subtotal = q * unitPrice;
      totalQuantity += q;
      totalAmount += subtotal;

      validatedItems.push({
        med,
        quantity: q,
        unitPrice,
        subtotal,
      });
    }

    // 1. Insert master sale record with sequential INV-YYYY-XXXX numbering
    let saleRow: any = null;
    let invoiceNumber = await this.getNextInvoiceNumber();

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: inserted, error: saleErr } = await client
        .from('sales')
        .insert({
          sale_number: invoiceNumber,
          customer_name: data.customerName?.trim() || 'Walk-in Customer',
          total_items: data.items.length,
          total_quantity: totalQuantity,
          total_amount: totalAmount,
          idempotency_key: data.idempotencyKey || null,
        })
        .select()
        .single();

      if (!saleErr && inserted) {
        saleRow = inserted;
        break;
      }

      if (saleErr && (saleErr.code === '23505' || saleErr.message?.includes('duplicate key') || saleErr.message?.includes('unique'))) {
        const parts = invoiceNumber.split('-');
        const currentYear = new Date().getFullYear();
        const nextNum = parseInt(parts[2] || '0', 10) + 1;
        invoiceNumber = `INV-${currentYear}-${String(nextNum).padStart(4, '0')}`;
        continue;
      }

      throw new Error(`Failed to record sale: ${saleErr?.message}`);
    }

    if (!saleRow) throw new Error('Failed to record sale after invoice sequence generation.');

    const insertedItems: SaleItem[] = [];

    // 2. Perform FEFO batch deduction for each item
    for (const valItem of validatedItems) {
      const medId = valItem.med.id;
      const requestedQty = valItem.quantity;

      const fefoRes = await this.allocateFefo(medId, requestedQty, `Sale #${invoiceNumber}`);
      if (!fefoRes.success) {
        throw new Error(fefoRes.error || `Insufficient stock for ${valItem.med.name}`);
      }

      const { data: siRow, error: siErr } = await client
        .from('sale_items')
        .insert({
          sale_id: saleRow.id,
          medicine_id: medId,
          medicine_name: valItem.med.name,
          unit: valItem.med.unit,
          quantity: requestedQty,
          unit_price: valItem.unitPrice,
          subtotal: valItem.subtotal,
        })
        .select()
        .single();

      if (siErr || !siRow) throw new Error(`Failed to record sale item: ${siErr?.message}`);

      // Record batch allocations
      for (const alloc of fefoRes.allocatedBatches) {
        await client.from('sale_batch_allocations').insert({
          sale_item_id: siRow.id,
          batch_id: alloc.batchId,
          batch_number: alloc.batchNumber,
          quantity: alloc.quantity,
          expiry_date: alloc.expiryDate,
        });
      }

      insertedItems.push({
        id: siRow.id,
        saleId: saleRow.id,
        medicineId: medId,
        medicineName: valItem.med.name,
        unit: valItem.med.unit,
        quantity: requestedQty,
        unitPrice: valItem.unitPrice,
        subtotal: valItem.subtotal,
        batchAllocations: fefoRes.allocatedBatches,
      });
    }

    const firstItem = insertedItems[0];
    return {
      id: saleRow.id,
      saleNumber: invoiceNumber,
      customerName: saleRow.customer_name,
      items: insertedItems,
      totalItems: insertedItems.length,
      totalQuantity,
      totalAmount,
      idempotencyKey: saleRow.idempotency_key || undefined,
      createdAt: new Date(saleRow.created_at).toISOString(),
      medicineId: firstItem?.medicineId,
      medicineName: firstItem?.medicineName,
      quantity: firstItem?.quantity,
      unitPrice: firstItem?.unitPrice,
      batchesDeducted: firstItem?.batchAllocations,
    };
  }

  public async recordSale(medicineId: string, quantity: number) {
    const sale = await this.createSale({
      customerName: 'Walk-in Customer',
      items: [{ medicineId, quantity }],
    });
    return {
      sale,
      batchesDeducted: sale.items[0]?.batchAllocations || [],
    };
  }

  // ---------------------------------------------------------------------------
  // DASHBOARD & ANALYTICS
  // ---------------------------------------------------------------------------
  public async getTodaySalesAmount(): Promise<number> {
    const client = this.getClient();
    const todayStr = new Date().toISOString().split('T')[0];
    const { data } = await client
      .from('sales')
      .select('total_amount')
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`);

    return (data || []).reduce((sum, r) => sum + Number(r.total_amount), 0);
  }

  public async getTodayPurchaseAmount(): Promise<number> {
    const client = this.getClient();
    const todayStr = new Date().toISOString().split('T')[0];
    const { data } = await client
      .from('purchases')
      .select('total_amount')
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .lte('created_at', `${todayStr}T23:59:59.999Z`);

    return (data || []).reduce((sum, r) => sum + Number(r.total_amount), 0);
  }

  public async getMonthSalesAmount(): Promise<number> {
    const client = this.getClient();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data } = await client
      .from('sales')
      .select('total_amount')
      .gte('created_at', firstDay);

    return (data || []).reduce((sum, r) => sum + Number(r.total_amount), 0);
  }

  public async getRecentSalesTrend(days = 7): Promise<{ date: string; label: string; amount: number; count: number }[]> {
    const client = this.getClient();
    const now = Date.now();
    const oneDay = 24 * 3600 * 1000;
    const sinceDate = new Date(now - (days - 1) * oneDay).toISOString().split('T')[0];

    const { data } = await client
      .from('sales')
      .select('created_at, total_amount')
      .gte('created_at', `${sinceDate}T00:00:00.000Z`);

    const salesByDay = new Map<string, { amount: number; count: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * oneDay);
      const dateKey = d.toISOString().split('T')[0];
      salesByDay.set(dateKey, { amount: 0, count: 0 });
    }

    for (const s of data || []) {
      const dKey = s.created_at.split('T')[0];
      if (salesByDay.has(dKey)) {
        const cur = salesByDay.get(dKey)!;
        cur.amount += Number(s.total_amount);
        cur.count += 1;
      }
    }

    return Array.from(salesByDay.entries()).map(([dateStr, stat]) => {
      const d = new Date(dateStr);
      return {
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: Math.round(stat.amount * 100) / 100,
        count: stat.count,
      };
    });
  }

  public async getCategoryDistribution(): Promise<{ category: string; medicineCount: number; usableStock: number; totalValue: number }[]> {
    const medicines = await this.getAllMedicines();
    const map = new Map<string, { medicineCount: number; usableStock: number; totalValue: number }>();

    for (const m of medicines) {
      const cat = m.category || 'General';
      const existing = map.get(cat) || { medicineCount: 0, usableStock: 0, totalValue: 0 };
      existing.medicineCount += 1;
      existing.usableStock += m.usableStock;
      existing.totalValue += m.usableStock * m.sellingPrice;
      map.set(cat, existing);
    }

    return Array.from(map.entries()).map(([category, stats]) => ({
      category,
      medicineCount: stats.medicineCount,
      usableStock: stats.usableStock,
      totalValue: Math.round(stats.totalValue * 100) / 100,
    }));
  }

  public async getInventoryAlerts() {
    const settings = await this.getShopSettings();
    const medicines = await this.getAllMedicines();

    const lowStockMedicines: MedicineWithBatches[] = [];
    const outOfStockMedicines: MedicineWithBatches[] = [];
    const nearExpiryBatches: any[] = [];
    const expiredBatches: any[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const med of medicines) {
      if (med.isOutOfStock) {
        outOfStockMedicines.push(med);
      } else if (med.isLowStock) {
        lowStockMedicines.push(med);
      }

      for (const b of med.batches) {
        const exp = new Date(b.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const diffMs = exp.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          expiredBatches.push({
            batchId: b.id,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            expiryDate: b.expiryDate,
            daysRemaining,
            isExpired: true,
          });
        } else if (daysRemaining <= settings.nearExpiryDays && b.quantity > 0) {
          nearExpiryBatches.push({
            batchId: b.id,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            expiryDate: b.expiryDate,
            daysRemaining,
            isNearExpiry: true,
          });
        }
      }
    }

    return {
      summary: {
        totalMedicines: medicines.length,
        lowStockCount: lowStockMedicines.length,
        outOfStockCount: outOfStockMedicines.length,
        nearExpiryBatchCount: nearExpiryBatches.length,
        expiredBatchCount: expiredBatches.length,
        nearExpiryThresholdDays: settings.nearExpiryDays,
      },
      lowStockMedicines,
      outOfStockMedicines,
      nearExpiryBatches,
      expiredBatches,
    };
  }

  public async getDashboardAnalytics() {
    const [medicines, allSales, allPurchases, settings] = await Promise.all([
      this.getAllMedicines(),
      this.getAllSales(),
      this.getAllPurchases(),
      this.getShopSettings(),
    ]);

    const totalMedicines = medicines.length;
    const availableStock = medicines.reduce((sum, m) => sum + m.usableStock, 0);
    const totalInventoryValue = medicines.reduce((sum, m) => sum + m.usableStock * m.sellingPrice, 0);

    const nearExpiryDays = settings.nearExpiryDays || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nearExpiryThreshold = new Date(today);
    nearExpiryThreshold.setDate(nearExpiryThreshold.getDate() + nearExpiryDays);

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let nearExpiryBatchCount = 0;
    let expiredBatchCount = 0;
    const lowStockMedicines: any[] = [];
    const nearExpiryBatches: any[] = [];
    const expiredBatches: any[] = [];

    const categoryMap = new Map<string, number>();

    for (const m of medicines) {
      if (m.usableStock === 0) outOfStockCount++;
      else if (m.usableStock <= m.minStockLevel) {
        lowStockCount++;
        lowStockMedicines.push({
          id: m.id,
          name: m.name,
          category: m.category,
          totalStock: m.usableStock,
          minStock: m.minStockLevel,
          unit: m.unit,
        });
      }

      const catCount = categoryMap.get(m.category) || 0;
      categoryMap.set(m.category, catCount + 1);

      for (const b of m.batches) {
        const exp = new Date(b.expiryDate);
        exp.setHours(0, 0, 0, 0);
        if (exp < today) {
          expiredBatchCount++;
          expiredBatches.push({ ...b, medicineName: m.name });
        } else if (exp <= nearExpiryThreshold) {
          nearExpiryBatchCount++;
          nearExpiryBatches.push({ ...b, medicineName: m.name });
        }
      }
    }

    const categoryDistribution = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
      percentage: totalMedicines > 0 ? Math.round((count / totalMedicines) * 100) : 0,
    }));

    const todayStr = today.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    let todaySales = 0;
    let monthSales = 0;
    for (const s of allSales) {
      const sDate = s.createdAt ? s.createdAt.split('T')[0] : '';
      if (sDate === todayStr) todaySales += Number(s.totalAmount || 0);
      if (sDate.startsWith(currentMonthStr)) monthSales += Number(s.totalAmount || 0);
    }
    todaySales = Math.round(todaySales * 100) / 100;
    monthSales = Math.round(monthSales * 100) / 100;

    let todayPurchases = 0;
    for (const p of allPurchases) {
      const pDate = p.createdAt ? p.createdAt.split('T')[0] : '';
      if (pDate === todayStr) todayPurchases += Number(p.totalAmount || 0);
    }
    todayPurchases = Math.round(todayPurchases * 100) / 100;

    const salesTrend: { date: string; amount: number; orderCount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().split('T')[0];
      const daySales = allSales.filter((s) => s.createdAt && s.createdAt.startsWith(dayKey));
      salesTrend.push({
        date: dayKey,
        amount: Math.round(daySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0) * 100) / 100,
        orderCount: daySales.length,
      });
    }

    const recentSales = allSales.slice(0, 5);
    const recentPurchases = allPurchases.slice(0, 5);

    const summary = {
      totalMedicines,
      availableStock,
      lowStockCount,
      outOfStockCount,
      todaySalesAmount: todaySales,
      todayPurchaseAmount: todayPurchases,
      nearExpiryBatchCount,
      expiredBatchCount,
      monthSalesAmount: monthSales,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    };

    return {
      summary,
      metrics: summary,
      salesTrend7Days: salesTrend,
      categoryDistribution,
      recentSales,
      recentPurchases,
      lowStockMedicines: lowStockMedicines.slice(0, 5),
      nearExpiryBatches: nearExpiryBatches.slice(0, 5),
      nearExpiryMedicines: nearExpiryBatches.slice(0, 5),
      settings,
      // Flat properties
      totalMedicines,
      availableStock,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      todaySalesAmount: todaySales,
      todayPurchaseAmount: todayPurchases,
      monthSalesAmount: monthSales,
      lowStockCount,
      outOfStockCount,
      nearExpiryBatchCount,
      expiredBatchCount,
    };
  }

  public async getSalesAnalytics(params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) {
    const allSales = await this.getAllSales();
    let filtered = [...allSales];

    if (params?.startDate) {
      filtered = filtered.filter((s) => s.createdAt >= params.startDate!);
    }
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      filtered = filtered.filter((s) => s.createdAt <= end);
    }

    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalUnitsSold = filtered.reduce((sum, s) => sum + s.totalQuantity, 0);
    const avgOrderValue = totalSales > 0 ? Math.round((totalRevenue / totalSales) * 100) / 100 : 0;

    const groupBy = params?.groupBy || 'day';
    const groupMap = new Map<string, { label: string; totalAmount: number; totalItems: number; transactionCount: number }>();

    for (const sale of filtered) {
      const d = new Date(sale.createdAt);
      let key = d.toISOString().split('T')[0];
      let label = key;
      if (groupBy === 'week') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d);
        mon.setDate(diff);
        key = mon.toISOString().split('T')[0];
        label = `Week of ${key}`;
      } else if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      const existing = groupMap.get(key) || { label, totalAmount: 0, totalItems: 0, transactionCount: 0 };
      existing.totalAmount = Math.round((existing.totalAmount + sale.totalAmount) * 100) / 100;
      existing.totalItems += sale.totalQuantity;
      existing.transactionCount += 1;
      groupMap.set(key, existing);
    }

    const trend = Array.from(groupMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const medicineSalesMap = new Map<string, { medicineName: string; unitsSold: number; revenue: number }>();
    for (const sale of filtered) {
      for (const item of sale.items) {
        const existing = medicineSalesMap.get(item.medicineId) || {
          medicineName: item.medicineName,
          unitsSold: 0,
          revenue: 0,
        };
        existing.unitsSold += item.quantity;
        existing.revenue += item.subtotal;
        medicineSalesMap.set(item.medicineId, existing);
      }
    }

    const topSelling = Array.from(medicineSalesMap.entries())
      .map(([medicineId, data]) => ({
        medicineId,
        medicineName: data.medicineName,
        unitsSold: data.unitsSold,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      summary: {
        totalSalesAmount: Math.round(totalRevenue * 100) / 100,
        totalItemsSold: totalUnitsSold,
        totalTransactions: totalSales,
        averageOrderValue: avgOrderValue,
      },
      trend,
      // Flat backwards-compatibility aliases
      totalSales,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalUnitsSold,
      avgOrderValue,
      topSellingMedicines: topSelling,
      timeline: trend.length > 0 ? trend : await this.getRecentSalesTrend(30),
    };
  }

  public async getInventoryAnalytics() {
    const medicines = await this.getAllMedicines();
    const alerts = await this.getInventoryAlerts();

    const totalUsableStock = medicines.reduce((sum, m) => sum + m.usableStock, 0);
    const totalExpiredStock = medicines.reduce((sum, m) => sum + m.expiredStock, 0);
    const totalValue = medicines.reduce((sum, m) => sum + m.usableStock * m.sellingPrice, 0);

    return {
      summary: {
        totalMedicines: medicines.length,
        totalUsableStock,
        totalExpiredStock,
        totalInventoryValue: Math.round(totalValue * 100) / 100,
        lowStockCount: alerts.summary.lowStockCount,
        outOfStockCount: alerts.summary.outOfStockCount,
        nearExpiryBatchCount: alerts.summary.nearExpiryBatchCount,
        expiredBatchCount: alerts.summary.expiredBatchCount,
      },
      categoryDistribution: await this.getCategoryDistribution(),
      lowStockMedicines: alerts.lowStockMedicines,
      outOfStockMedicines: alerts.outOfStockMedicines,
      nearExpiryBatches: alerts.nearExpiryBatches,
      expiredBatches: alerts.expiredBatches,
      // Flat backwards-compatibility aliases
      totalMedicines: medicines.length,
      totalUsableStock,
      totalExpiredStock,
      totalInventoryValue: Math.round(totalValue * 100) / 100,
      lowStockCount: alerts.summary.lowStockCount,
      outOfStockCount: alerts.summary.outOfStockCount,
      nearExpiryCount: alerts.summary.nearExpiryBatchCount,
      expiredCount: alerts.summary.expiredBatchCount,
      categories: await this.getCategoryDistribution(),
    };
  }

  public async getPurchaseAnalytics(params?: { startDate?: string; endDate?: string }) {
    const allPurchases = await this.getAllPurchases();
    let filtered = [...allPurchases];

    if (params?.startDate) {
      filtered = filtered.filter((p) => p.createdAt >= params.startDate!);
    }
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      filtered = filtered.filter((p) => p.createdAt <= end);
    }

    const totalOrders = filtered.length;
    const totalSpent = filtered.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalUnitsReceived = filtered.reduce((sum, p) => sum + p.totalQuantity, 0);

    const supplierMap = new Map<string, { supplierName: string; orderCount: number; totalSpent: number; totalQuantity: number }>();
    const timelineMap = new Map<string, { label: string; totalAmount: number; totalQuantity: number; count: number }>();

    for (const p of filtered) {
      const existing = supplierMap.get(p.supplierId) || {
        supplierName: p.supplierName,
        orderCount: 0,
        totalSpent: 0,
        totalQuantity: 0,
      };
      existing.orderCount += 1;
      existing.totalSpent = Math.round((existing.totalSpent + p.totalAmount) * 100) / 100;
      existing.totalQuantity += p.totalQuantity;
      supplierMap.set(p.supplierId, existing);

      const d = new Date(p.createdAt);
      const dateKey = d.toISOString().split('T')[0];
      const curTimeline = timelineMap.get(dateKey) || {
        label: dateKey,
        totalAmount: 0,
        totalQuantity: 0,
        count: 0,
      };
      curTimeline.totalAmount = Math.round((curTimeline.totalAmount + p.totalAmount) * 100) / 100;
      curTimeline.totalQuantity += p.totalQuantity;
      curTimeline.count += 1;
      timelineMap.set(dateKey, curTimeline);
    }

    const purchasesBySupplier = Array.from(supplierMap.entries()).map(([supplierId, data]) => ({
      supplierId,
      supplierName: data.supplierName,
      purchaseCount: data.orderCount,
      totalAmount: data.totalSpent,
      totalQuantity: data.totalQuantity,
    }));

    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalPurchasesCount: totalOrders,
        totalPurchaseAmount: Math.round(totalSpent * 100) / 100,
        totalUnitsPurchased: totalUnitsReceived,
      },
      purchasesBySupplier,
      timeline,
      recentPurchases: filtered.slice(0, 5),
      // Flat backwards-compatibility aliases
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalUnitsReceived,
      bySupplier: purchasesBySupplier,
    };
  }

  // ---------------------------------------------------------------------------
  // REPORTS
  // ---------------------------------------------------------------------------
  public async getSalesReportData(params?: { startDate?: string; endDate?: string }) {
    const sales = await this.getAllSales();
    let list = [...sales];
    if (params?.startDate) list = list.filter((s) => s.createdAt >= params.startDate!);
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      list = list.filter((s) => s.createdAt <= end);
    }

    return list.map((s) => ({
      saleId: s.saleNumber || s.id,
      date: s.createdAt,
      customer: s.customerName || 'Walk-in Customer',
      numberOfItems: s.items ? s.items.length : 1,
      totalQuantity: s.totalQuantity || s.quantity || 0,
      totalAmount: s.totalAmount,
    }));
  }

  public async getInventoryReportData(params?: { category?: string; stockStatus?: string }) {
    let list = await this.getAllMedicines();
    if (params?.category) list = list.filter((m) => m.category.toLowerCase() === params.category!.toLowerCase());
    if (params?.stockStatus) list = list.filter((m) => m.stockStatus.toLowerCase() === params.stockStatus!.toLowerCase());

    return list.map((m) => ({
      medicineName: m.name,
      genericName: m.genericName || 'N/A',
      category: m.category,
      unit: m.unit,
      availableStock: m.usableStock,
      minStockLevel: m.minStockLevel,
      sellingPrice: m.sellingPrice,
      stockStatus: m.stockStatus,
    }));
  }

  public async getExpiryReportData(status?: 'all' | 'near_expiry' | 'expired') {
    const alerts = await this.getInventoryAlerts();
    const medicines = await this.getAllMedicines();
    const medMap = new Map(medicines.map((m) => [m.id, m]));

    let rows: {
      medicineName: string;
      category: string;
      batchNumber: string;
      batchQuantity: number;
      expiryDate: string;
      daysRemaining: number;
      expiryStatus: 'Expired' | 'Near Expiry';
    }[] = [];

    if (status !== 'expired') {
      rows = rows.concat(
        alerts.nearExpiryBatches.map((b: any) => ({
          medicineName: b.medicineName,
          category: medMap.get(b.medicineId)?.category || 'General',
          batchNumber: b.batchNumber,
          batchQuantity: b.quantity,
          expiryDate: b.expiryDate,
          daysRemaining: b.daysRemaining,
          expiryStatus: 'Near Expiry' as const,
        }))
      );
    }

    if (status !== 'near_expiry') {
      rows = rows.concat(
        alerts.expiredBatches.map((b: any) => ({
          medicineName: b.medicineName,
          category: medMap.get(b.medicineId)?.category || 'General',
          batchNumber: b.batchNumber,
          batchQuantity: b.quantity,
          expiryDate: b.expiryDate,
          daysRemaining: b.daysRemaining,
          expiryStatus: 'Expired' as const,
        }))
      );
    }

    rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return rows;
  }

  public async getPurchaseReportData(params?: { supplierId?: string; startDate?: string; endDate?: string }) {
    let list = await this.getAllPurchases();
    if (params?.supplierId) list = list.filter((p) => p.supplierId === params.supplierId);
    if (params?.startDate) list = list.filter((p) => p.createdAt >= params.startDate!);
    if (params?.endDate) {
      const end = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      list = list.filter((p) => p.createdAt <= end);
    }

    return list.map((p) => ({
      purchaseId: p.purchaseNumber || p.id,
      supplierName: p.supplierName,
      date: p.createdAt,
      numberOfItems: p.items.length,
      totalQuantity: p.totalQuantity,
      totalAmount: p.totalAmount,
    }));
  }

  // ---------------------------------------------------------------------------
  // FORECAST SETTINGS & REORDER REVIEWS
  // ---------------------------------------------------------------------------
  public async getForecastSettings(): Promise<ForecastSettings> {
    const client = this.getClient();
    const { data } = await client
      .from('forecast_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        defaultHorizonDays: 30,
        safetyBufferDays: 5,
        minDataDaysRequired: 7,
        method: 'weighted_moving_average',
      };
    }
    const r = data[0];
    return {
      defaultHorizonDays: Number(r.default_horizon_days),
      safetyBufferDays: Number(r.safety_buffer_days),
      minDataDaysRequired: Number(r.min_data_days_required),
      method: r.method,
    };
  }

  public async updateForecastSettings(updates: Partial<ForecastSettings>): Promise<ForecastSettings> {
    const client = this.getClient();
    const current = await this.getForecastSettings();
    const updated = {
      default_horizon_days: updates.defaultHorizonDays !== undefined ? Number(updates.defaultHorizonDays) : current.defaultHorizonDays,
      safety_buffer_days: updates.safetyBufferDays !== undefined ? Number(updates.safetyBufferDays) : current.safetyBufferDays,
      min_data_days_required: updates.minDataDaysRequired !== undefined ? Number(updates.minDataDaysRequired) : current.minDataDaysRequired,
      method: updates.method || current.method,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await client.from('forecast_settings').select('id').limit(1);
    if (existing && existing.length > 0) {
      await client.from('forecast_settings').update(updated).eq('id', existing[0].id);
    } else {
      await client.from('forecast_settings').insert(updated);
    }

    return {
      defaultHorizonDays: updated.default_horizon_days,
      safetyBufferDays: updated.safety_buffer_days,
      minDataDaysRequired: updated.min_data_days_required,
      method: updated.method as any,
    };
  }

  public async getReorderReviews(): Promise<Map<string, SupabaseReviewRecord>> {
    const client = this.getClient();
    const { data } = await client.from('reorder_recommendation_reviews').select('*');
    const map = new Map<string, SupabaseReviewRecord>();
    for (const r of data || []) {
      map.set(r.medicine_id, {
        status: r.review_status,
        suggestedQuantity: Number(r.suggested_quantity),
        adjustedQuantity: r.adjusted_quantity !== null ? Number(r.adjusted_quantity) : undefined,
        reviewerNotes: r.reviewer_notes || undefined,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
      });
    }
    return map;
  }

  public async saveReorderReview(
    medicineId: string,
    data: {
      status: ReviewStatus;
      suggestedQuantity: number;
      adjustedQuantity?: number;
      reviewerNotes?: string;
    }
  ): Promise<SupabaseReviewRecord> {
    const client = this.getClient();
    const now = new Date().toISOString();

    const payload = {
      medicine_id: medicineId,
      review_status: data.status,
      suggested_quantity: data.suggestedQuantity,
      adjusted_quantity: data.adjustedQuantity !== undefined ? data.adjustedQuantity : null,
      reviewer_notes: data.reviewerNotes || null,
      reviewed_at: now,
      updated_at: now,
    };

    const { error } = await client
      .from('reorder_recommendation_reviews')
      .upsert(payload, { onConflict: 'medicine_id' });

    if (error) throw new Error(`Failed to save review: ${error.message}`);

    return {
      status: data.status,
      suggestedQuantity: data.suggestedQuantity,
      adjustedQuantity: data.adjustedQuantity,
      reviewerNotes: data.reviewerNotes,
      reviewedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // AI BILL INVENTORY INTAKE & TRANSACTIONAL SAVE
  // ---------------------------------------------------------------------------
  public async confirmBillPurchase(data: ConfirmBillInput): Promise<ConfirmBillResult> {
    const client = this.getClient();

    if (!data.items || data.items.length === 0) {
      throw new Error('At least one medicine item is required to record the bill.');
    }

    const cleanInvoiceNumber = (data.invoiceNumber || '').trim();
    if (!cleanInvoiceNumber) {
      throw new Error('Invoice / Bill number is required.');
    }

    // 1. Prevent duplicate invoice entry
    const { data: existingPo } = await client
      .from('purchases')
      .select('id, purchase_number, created_at')
      .or(`purchase_number.ilike.%${cleanInvoiceNumber}%,notes.ilike.%${cleanInvoiceNumber}%`)
      .limit(1);

    if (existingPo && existingPo.length > 0) {
      throw new Error(
        `Invoice #${cleanInvoiceNumber} has already been recorded on ${new Date(
          existingPo[0].created_at
        ).toLocaleDateString()} (Order: ${existingPo[0].purchase_number}). Duplicate invoice processing is blocked.`
      );
    }

    // 2. Resolve Supplier
    let supplierId = data.supplierId;
    let supplierName = data.supplierName?.trim() || 'General Supplier';

    if (supplierId) {
      const { data: sRow } = await client.from('suppliers').select('id, name').eq('id', supplierId).maybeSingle();
      if (sRow) {
        supplierName = sRow.name;
      } else {
        supplierId = undefined;
      }
    }

    if (!supplierId) {
      const { data: matchedSupplier } = await client
        .from('suppliers')
        .select('id, name')
        .ilike('name', supplierName)
        .maybeSingle();

      if (matchedSupplier) {
        supplierId = matchedSupplier.id;
        supplierName = matchedSupplier.name;
      } else {
        const { data: newSupp, error: newSuppErr } = await client
          .from('suppliers')
          .insert({
            name: supplierName,
            phone: data.supplierPhone?.trim() || 'N/A',
            email: data.supplierEmail?.trim() || null,
            address: data.supplierAddress?.trim() || null,
          })
          .select()
          .single();

        if (newSuppErr || !newSupp) {
          throw new Error(`Failed to register supplier "${supplierName}": ${newSuppErr?.message}`);
        }
        supplierId = newSupp.id;
        supplierName = newSupp.name;
      }
    }

    // 3. Process items in batched operations
    const tStart = Date.now();
    const newMedicinesCreated: { id: string; name: string; category: string }[] = [];
    const batchesCreated: { id: string; medicineId: string; batchNumber: string; quantity: number }[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    // 3a. In-memory pre-validation of all items
    for (const item of data.items) {
      const qty = Math.round(Number(item.quantity));
      if (!qty || qty <= 0) {
        throw new Error(`Quantity for "${item.name}" must be greater than 0.`);
      }

      const pPrice = Number(item.purchasePrice);
      if (isNaN(pPrice) || pPrice < 0) {
        throw new Error(`Purchase price for "${item.name}" must be a valid non-negative number.`);
      }

      const batchNum = (item.batchNumber || '').trim().toUpperCase();
      if (!batchNum) {
        throw new Error(`Batch number is required for "${item.name}".`);
      }

      const expiry = (item.expiryDate || '').trim();
      if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
        throw new Error(`Valid expiry date (YYYY-MM-DD) is required for "${item.name}".`);
      }

      if (expiry < todayStr) {
        throw new Error(
          `Medicine "${item.name}" batch ${batchNum} has an expired date (${expiry}). Cannot intake expired inventory.`
        );
      }
    }

    // 3b. Batched Medicine Resolution
    const tMed0 = Date.now();
    const providedMedIds = Array.from(
      new Set(data.items.map((it) => it.medicineId).filter((id): id is string => Boolean(id)))
    );
    const itemNamesToLookup = Array.from(new Set(data.items.map((it) => it.name.trim())));

    // Fetch existing candidate medicines in a small number of batched queries
    const existingMedsMap = new Map<string, { id: string; name: string; category: string; unit: string; sellingPrice: number }>();

    // 1) By provided IDs
    if (providedMedIds.length > 0) {
      const { data: medsById } = await withDbTimeout(
        client
          .from('medicines')
          .select('id, name, category, unit, selling_price')
          .in('id', providedMedIds),
        DEFAULT_DB_TIMEOUT_MS,
        'Batch fetch medicines by ID'
      );
      for (const m of medsById || []) {
        existingMedsMap.set(m.id, {
          id: m.id,
          name: m.name,
          category: m.category,
          unit: m.unit,
          sellingPrice: Number(m.selling_price),
        });
        existingMedsMap.set(m.name.trim().toLowerCase(), {
          id: m.id,
          name: m.name,
          category: m.category,
          unit: m.unit,
          sellingPrice: Number(m.selling_price),
        });
      }
    }

    // 2) By item names
    if (itemNamesToLookup.length > 0) {
      const { data: medsByName } = await withDbTimeout(
        client
          .from('medicines')
          .select('id, name, category, unit, selling_price')
          .in('name', itemNamesToLookup),
        DEFAULT_DB_TIMEOUT_MS,
        'Batch fetch medicines by Name'
      );
      for (const m of medsByName || []) {
        const itemObj = {
          id: m.id,
          name: m.name,
          category: m.category,
          unit: m.unit,
          sellingPrice: Number(m.selling_price),
        };
        existingMedsMap.set(m.id, itemObj);
        existingMedsMap.set(m.name.trim().toLowerCase(), itemObj);
      }
    }

    // Identify new medicines that genuinely need insertion
    const resolvedItemMedIds: string[] = [];
    for (const item of data.items) {
      const cleanName = item.name.trim();
      const lowerName = cleanName.toLowerCase();
      let matched = item.medicineId ? existingMedsMap.get(item.medicineId) : undefined;
      if (!matched) {
        matched = existingMedsMap.get(lowerName);
      }

      if (matched) {
        resolvedItemMedIds.push(matched.id);
      } else {
        // Create new medicine
        const pPrice = Number(item.purchasePrice);
        const sellPrice =
          item.sellingPrice && Number(item.sellingPrice) > 0
            ? Number(item.sellingPrice)
            : Math.round(pPrice * 1.3 * 100) / 100 || 10;

        const { data: newMed, error: newMedErr } = await withDbTimeout(
          client
            .from('medicines')
            .insert({
              name: cleanName,
              generic_name: item.genericName?.trim() || null,
              category: item.category?.trim() || 'General',
              manufacturer: item.manufacturer?.trim() || null,
              description: item.description?.trim() || null,
              unit: item.unit?.trim() || 'tablets',
              min_stock_level: item.minStockLevel || 10,
              purchase_price: pPrice,
              selling_price: sellPrice,
            })
            .select()
            .single(),
          DEFAULT_DB_TIMEOUT_MS,
          `Insert medicine "${cleanName}"`
        );

        if (newMedErr || !newMed) {
          throw new Error(`Failed to create medicine "${cleanName}": ${newMedErr?.message}`);
        }

        const newObj = {
          id: newMed.id,
          name: newMed.name,
          category: newMed.category,
          unit: newMed.unit,
          sellingPrice: Number(newMed.selling_price),
        };
        existingMedsMap.set(newMed.id, newObj);
        existingMedsMap.set(lowerName, newObj);
        newMedicinesCreated.push({ id: newMed.id, name: newMed.name, category: newMed.category });
        resolvedItemMedIds.push(newMed.id);
      }
    }
    console.log(`[ConfirmBill] Resolved ${data.items.length} medicines in ${Date.now() - tMed0}ms (Created: ${newMedicinesCreated.length})`);

    // 3c. Batched Batch Resolution
    const tBatch0 = Date.now();
    const distinctResolvedMedIds = Array.from(new Set(resolvedItemMedIds));
    const { data: existingBatchesData } = await withDbTimeout(
      client
        .from('medicine_batches')
        .select('*')
        .in('medicine_id', distinctResolvedMedIds),
      DEFAULT_DB_TIMEOUT_MS,
      'Batch fetch existing medicine batches'
    );

    const existingBatchesMap = new Map<string, any>();
    for (const b of existingBatchesData || []) {
      existingBatchesMap.set(`${b.medicine_id}:${b.batch_number.trim().toUpperCase()}`, b);
    }

    const resolvedBatchIds: string[] = [];
    const stockMovementsToInsert: any[] = [];
    const preparedPurchaseItems: {
      medicineId: string;
      batchId?: string;
      batchNumber: string;
      quantity: number;
      purchasePrice: number;
      subtotal: number;
      expiryDate: string;
      mfgDate?: string;
    }[] = [];

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const medicineId = resolvedItemMedIds[i];
      const qty = Math.round(Number(item.quantity));
      const pPrice = Number(item.purchasePrice);
      const batchNum = (item.batchNumber || '').trim().toUpperCase();
      const expiry = (item.expiryDate || '').trim();
      const subtotal = Math.round(qty * pPrice * 100) / 100;

      totalQuantity += qty;
      totalAmount += subtotal;

      const batchKey = `${medicineId}:${batchNum}`;
      const existingBatch = existingBatchesMap.get(batchKey);
      let batchId: string;

      if (existingBatch) {
        batchId = existingBatch.id;
        const newQty = Number(existingBatch.quantity) + qty;
        await withDbTimeout(
          client
            .from('medicine_batches')
            .update({
              quantity: newQty,
              expiry_date: expiry,
              mfg_date: item.mfgDate || existingBatch.mfg_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', batchId),
          DEFAULT_DB_TIMEOUT_MS,
          `Update batch ${batchNum}`
        );
        // Update local map to reflect new quantity
        existingBatch.quantity = newQty;
      } else {
        const { data: newBatch, error: batchErr } = await withDbTimeout(
          client
            .from('medicine_batches')
            .insert({
              medicine_id: medicineId,
              batch_number: batchNum,
              quantity: qty,
              expiry_date: expiry,
              mfg_date: item.mfgDate || null,
            })
            .select()
            .single(),
          DEFAULT_DB_TIMEOUT_MS,
          `Insert batch ${batchNum}`
        );

        if (batchErr || !newBatch) {
          throw new Error(`Failed to create batch "${batchNum}" for "${item.name}": ${batchErr?.message}`);
        }
        batchId = newBatch.id;
        existingBatchesMap.set(batchKey, newBatch);
      }

      resolvedBatchIds.push(batchId);
      batchesCreated.push({
        id: batchId,
        medicineId,
        batchNumber: batchNum,
        quantity: qty,
      });

      stockMovementsToInsert.push({
        medicine_id: medicineId,
        batch_id: batchId,
        batch_number: batchNum,
        movement_type: 'Stock Added',
        quantity: qty,
        reason: `Purchase Bill #${cleanInvoiceNumber} (AI Scanned entry)`,
      });

      preparedPurchaseItems.push({
        medicineId,
        batchId,
        batchNumber: batchNum,
        quantity: qty,
        purchasePrice: pPrice,
        subtotal,
        expiryDate: expiry,
        mfgDate: item.mfgDate,
      });
    }
    console.log(`[ConfirmBill] Resolved ${batchesCreated.length} batches in ${Date.now() - tBatch0}ms`);

    // 3d. Batched Stock Movements Insert
    const tStock0 = Date.now();
    if (stockMovementsToInsert.length > 0) {
      const { error: stockErr } = await withDbTimeout(
        client.from('stock_movements').insert(stockMovementsToInsert),
        DEFAULT_DB_TIMEOUT_MS,
        'Batch insert stock movements'
      );
      if (stockErr) {
        console.warn(`[ConfirmBill] Stock movement batch insert warning: ${stockErr.message}`);
      }
      console.log(`[ConfirmBill] Inserted ${stockMovementsToInsert.length} stock movements in ${Date.now() - tStock0}ms`);
    }

    // 4. Create Purchase record
    const { count } = await withDbTimeout(
      client.from('purchases').select('*', { count: 'exact', head: true }),
      DEFAULT_DB_TIMEOUT_MS,
      'Get purchase count'
    );
    const poNumber = `INV-${cleanInvoiceNumber}-${1001 + (count || 0)}`;

    const { data: poRow, error: poErr } = await withDbTimeout(
      client
        .from('purchases')
        .insert({
          purchase_number: poNumber,
          supplier_id: supplierId,
          total_quantity: totalQuantity,
          total_amount: Math.round(totalAmount * 100) / 100,
          notes: `AI Scanned Bill Invoice #${cleanInvoiceNumber}${data.notes ? ` | ${data.notes.trim()}` : ''}`,
        })
        .select()
        .single(),
      DEFAULT_DB_TIMEOUT_MS,
      'Create purchase record'
    );

    if (poErr || !poRow) {
      throw new Error(`Failed to create purchase order: ${poErr?.message}`);
    }

    // 5. Batched Insert of Purchase Items
    const tItems0 = Date.now();
    const purchaseItemRows = preparedPurchaseItems.map((p) => ({
      purchase_id: poRow.id,
      medicine_id: p.medicineId,
      batch_id: p.batchId,
      batch_number: p.batchNumber,
      quantity: p.quantity,
      purchase_price: p.purchasePrice,
      subtotal: p.subtotal,
      expiry_date: p.expiryDate,
      mfg_date: p.mfgDate || null,
    }));

    const { data: insertedItemsData, error: itemsErr } = await withDbTimeout(
      client
        .from('purchase_items')
        .insert(purchaseItemRows)
        .select('*, medicines(name)'),
      DEFAULT_DB_TIMEOUT_MS,
      'Batch insert purchase items'
    );

    if (itemsErr) {
      throw new Error(`Failed to save purchase items: ${itemsErr.message}`);
    }

    const insertedItems: PurchaseItem[] = (insertedItemsData || []).map((itemRow: any) => ({
      id: itemRow.id,
      purchaseId: itemRow.purchase_id,
      medicineId: itemRow.medicine_id,
      medicineName: itemRow.medicines?.name || 'Unknown',
      batchId: itemRow.batch_id || undefined,
      batchNumber: itemRow.batch_number,
      quantity: Number(itemRow.quantity),
      purchasePrice: Number(itemRow.purchase_price),
      subtotal: Number(itemRow.subtotal),
      expiryDate: itemRow.expiry_date,
      mfgDate: itemRow.mfg_date || undefined,
    }));
    console.log(`[ConfirmBill] Inserted ${insertedItems.length} purchase items in ${Date.now() - tItems0}ms`);
    console.log(`[ConfirmBill] Successfully confirmed bill #${cleanInvoiceNumber} total time: ${Date.now() - tStart}ms`);

    const createdPurchase: Purchase = {
      id: poRow.id,
      purchaseNumber: poRow.purchase_number,
      supplierId: supplierId!,
      supplierName,
      items: insertedItems,
      totalQuantity,
      totalAmount: Math.round(totalAmount * 100) / 100,
      notes: poRow.notes,
      createdAt: new Date(poRow.created_at).toISOString(),
    };

    return {
      purchase: createdPurchase,
      newMedicinesCreated,
      batchesCreated,
      totalQuantity,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // PROCUREMENT & ADMIN APPROVAL WORKFLOW
  // ---------------------------------------------------------------------------
  public async getAllPurchaseRequests(filter?: { status?: string; medicineId?: string }) {
    try {
      const client = getSupabaseClient();
      if (!client) return inMemoryStore.getAllPurchaseRequests(filter);
      let query = client.from('purchase_requests').select('*').order('created_at', { ascending: false });
      if (filter?.status) query = query.eq('status', filter.status);
      if (filter?.medicineId) query = query.eq('medicine_id', filter.medicineId);
      const { data, error } = await query;
      if (error || !data || data.length === 0) return inMemoryStore.getAllPurchaseRequests(filter);
      return data.map((r: any) => ({
        id: r.id,
        requestNumber: r.request_number || `REQ-${r.id.substring(0, 4)}`,
        medicineId: r.medicine_id,
        medicineName: r.medicine_name,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        currentStock: Number(r.current_stock || 0),
        forecastDemand: Number(r.forecast_demand || 0),
        recommendedQuantity: Number(r.recommended_quantity),
        priority: r.priority || 'medium',
        reason: r.reason,
        forecastExplanation: r.forecast_explanation,
        status: r.status,
        requestDate: new Date(r.created_at).toISOString(),
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : undefined,
        approvedBy: r.approved_by,
        rejectedAt: r.rejected_at ? new Date(r.rejected_at).toISOString() : undefined,
        rejectionReason: r.rejection_reason,
        unitPrice: r.unit_price ? Number(r.unit_price) : undefined,
        totalPrice: r.total_price ? Number(r.total_price) : undefined,
        expectedDelivery: r.expected_delivery,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    } catch {
      return inMemoryStore.getAllPurchaseRequests(filter);
    }
  }

  public async getPurchaseRequestById(id: string) {
    return inMemoryStore.getPurchaseRequestById(id);
  }

  public async generatePurchaseRequestFromRecommendation(data: any) {
    return inMemoryStore.generatePurchaseRequestFromRecommendation(data);
  }

  public async approvePurchaseRequest(id: string, approvedBy?: string) {
    return inMemoryStore.approvePurchaseRequest(id, approvedBy);
  }

  public async rejectPurchaseRequest(id: string, rejectionReason: string) {
    return inMemoryStore.rejectPurchaseRequest(id, rejectionReason);
  }

  public async getSupplierConversations() {
    return inMemoryStore.getSupplierConversations();
  }

  public async getSupplierConversationById(id: string) {
    return inMemoryStore.getSupplierConversationById(id);
  }

  public async getSupplierMessages(conversationId: string) {
    return inMemoryStore.getSupplierMessages(conversationId);
  }

  public async sendSupplierMessage(conversationId: string, messageText: string, senderType?: 'supplier' | 'ai' | 'system') {
    return inMemoryStore.sendSupplierMessage(conversationId, messageText, senderType);
  }

  public async getNotifications(role?: string) {
    return inMemoryStore.getNotifications(role);
  }

  public async markNotificationRead(id: string) {
    return inMemoryStore.markNotificationRead(id);
  }

  public async getProcurementSummary() {
    return inMemoryStore.getProcurementSummary();
  }
}

export const supabaseService = new SupabaseService();


