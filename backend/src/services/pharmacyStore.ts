export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  mfgDate?: string;
  expiryDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  medicineId: string;
  batchId?: string;
  batchNumber: string;
  movementType: 'Stock Added' | 'Stock Removed' | 'Adjustment';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  description?: string;
  unit: string; // 'tablets' | 'strips' | 'bottles' | 'boxes' | 'vials' | 'ampoules' | string
  minStockLevel: number;
  sellingPrice: number;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineWithBatches extends Medicine {
  batches: MedicineBatch[];
  usableStock: number;
  expiredStock: number;
  totalStock: number; // Equals usableStock (expired excluded from usable inventory)
  totalPhysicalStock: number;
  isLowStock: boolean;
  isNearExpiry: boolean;
  isExpired: boolean;
  isOutOfStock: boolean;
  stockStatus: 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Expired' | 'Out of Stock';
  earliestExpiry: string | null;
}

export interface ShopSettings {
  shopName: string;
  pharmacistName: string;
  nearExpiryDays: number;
}

export interface SaleRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  batchesDeducted: {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
  createdAt: string;
}

export interface FefoAllocationResult {
  success: boolean;
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  allocatedBatches: {
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }[];
  usableStockRemaining: number;
  error?: string;
}

class PharmacyStore {
  private settings: ShopSettings = {
    shopName: 'Sri Sai Medical & General Store',
    pharmacistName: 'Store Pharmacist',
    nearExpiryDays: 30, // 30 days for Phase 2 strict near-expiry requirement
  };

  private medicines: Medicine[] = [
    {
      id: 'med-1',
      name: 'Paracetamol 500mg Tablets',
      genericName: 'Acetaminophen',
      category: 'Analgesics',
      manufacturer: 'Apex Healthcare',
      description: 'Standard antipyretic and analgesic for pain & fever relief.',
      unit: 'tablets',
      minStockLevel: 30,
      sellingPrice: 15.0,
      purchasePrice: 9.5,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 'med-2',
      name: 'Amoxicillin 500mg Capsules',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Cipla Labs',
      description: 'Broad-spectrum penicillin antibiotic.',
      unit: 'strips',
      minStockLevel: 25,
      sellingPrice: 65.0,
      purchasePrice: 48.0,
      createdAt: '2026-08-05T09:00:00.000Z',
      updatedAt: '2026-08-05T09:00:00.000Z',
    },
    {
      id: 'med-3',
      name: 'Metformin 500mg Tablets',
      genericName: 'Metformin Hydrochloride',
      category: 'Diabetes Care',
      manufacturer: 'Sun Pharma',
      description: 'First-line medication for type 2 diabetes management.',
      unit: 'boxes',
      minStockLevel: 40,
      sellingPrice: 42.0,
      purchasePrice: 29.0,
      createdAt: '2026-08-10T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    },
    {
      id: 'med-4',
      name: 'Pantoprazole 40mg Tablets',
      genericName: 'Pantoprazole Sodium',
      category: 'Antacids',
      manufacturer: 'Alkem Laboratories',
      description: 'Proton pump inhibitor for acid reflux and heartburn.',
      unit: 'strips',
      minStockLevel: 20,
      sellingPrice: 55.0,
      purchasePrice: 36.0,
      createdAt: '2026-08-12T11:00:00.000Z',
      updatedAt: '2026-08-12T11:00:00.000Z',
    },
    {
      id: 'med-5',
      name: 'Cetirizine 10mg Tablets',
      genericName: 'Cetirizine Dihydrochloride',
      category: 'Antihistamines',
      manufacturer: 'Dr. Reddy Laboratories',
      description: 'Non-drowsy allergy and antihistamine medication.',
      unit: 'strips',
      minStockLevel: 25,
      sellingPrice: 22.0,
      purchasePrice: 14.5,
      createdAt: '2026-08-15T12:00:00.000Z',
      updatedAt: '2026-08-15T12:00:00.000Z',
    },
    {
      id: 'med-6',
      name: 'Azithromycin 500mg Tablets',
      genericName: 'Azithromycin',
      category: 'Antibiotics',
      manufacturer: 'Zydus Cadila',
      description: 'Macrolide antibiotic for respiratory & bacterial infections.',
      unit: 'strips',
      minStockLevel: 15,
      sellingPrice: 95.0,
      purchasePrice: 68.0,
      createdAt: '2026-08-20T13:00:00.000Z',
      updatedAt: '2026-08-20T13:00:00.000Z',
    },
    {
      id: 'med-7',
      name: 'Ascoril D Plus Cough Syrup',
      genericName: 'Dextromethorphan + Chlorpheniramine',
      category: 'Respiratory',
      manufacturer: 'Glenmark Pharma',
      description: 'Cough suppressant syrup for dry cough relief.',
      unit: 'bottles',
      minStockLevel: 15,
      sellingPrice: 120.0,
      purchasePrice: 85.0,
      createdAt: '2026-08-22T14:00:00.000Z',
      updatedAt: '2026-08-22T14:00:00.000Z',
    },
  ];

  private batches: MedicineBatch[] = [
    // Paracetamol 500mg (2 batches: B101 & B102)
    {
      id: 'batch-1',
      medicineId: 'med-1',
      batchNumber: 'PCM-B101',
      quantity: 60,
      mfgDate: '2026-01-10',
      expiryDate: '2027-04-10',
      createdAt: '2026-08-01T08:05:00.000Z',
      updatedAt: '2026-08-01T08:05:00.000Z',
    },
    {
      id: 'batch-2',
      medicineId: 'med-1',
      batchNumber: 'PCM-B102',
      quantity: 40,
      mfgDate: '2026-05-15',
      expiryDate: '2027-09-15',
      createdAt: '2026-08-01T08:06:00.000Z',
      updatedAt: '2026-08-01T08:06:00.000Z',
    },
    // Amoxicillin (Near expiry batch expiring in 20 days: 2026-10-23)
    {
      id: 'batch-3',
      medicineId: 'med-2',
      batchNumber: 'AMX-204',
      quantity: 12,
      mfgDate: '2025-11-20',
      expiryDate: '2026-10-23', // <= 30 days from 2026-10-03
      createdAt: '2026-08-05T09:05:00.000Z',
      updatedAt: '2026-08-05T09:05:00.000Z',
    },
    // Metformin (2 batches: one near expiry in 25 days, one in 2027)
    {
      id: 'batch-4',
      medicineId: 'med-3',
      batchNumber: 'MET-332',
      quantity: 18,
      mfgDate: '2025-12-05',
      expiryDate: '2026-10-28', // <= 30 days
      createdAt: '2026-08-10T10:05:00.000Z',
      updatedAt: '2026-08-10T10:05:00.000Z',
    },
    {
      id: 'batch-5',
      medicineId: 'med-3',
      batchNumber: 'MET-333',
      quantity: 45,
      mfgDate: '2026-04-15',
      expiryDate: '2027-08-15',
      createdAt: '2026-08-10T10:06:00.000Z',
      updatedAt: '2026-08-10T10:06:00.000Z',
    },
    // Pantoprazole 40mg
    {
      id: 'batch-6',
      medicineId: 'med-4',
      batchNumber: 'PAN-410',
      quantity: 35,
      mfgDate: '2026-02-28',
      expiryDate: '2027-02-28',
      createdAt: '2026-08-12T11:05:00.000Z',
      updatedAt: '2026-08-12T11:05:00.000Z',
    },
    // Cetirizine 10mg (Low stock: 8 units <= 25 minStockLevel)
    {
      id: 'batch-7',
      medicineId: 'med-5',
      batchNumber: 'CTZ-512',
      quantity: 8,
      mfgDate: '2026-05-18',
      expiryDate: '2027-05-18',
      createdAt: '2026-08-15T12:05:00.000Z',
      updatedAt: '2026-08-15T12:05:00.000Z',
    },
    // Azithromycin 500mg
    {
      id: 'batch-8',
      medicineId: 'med-6',
      batchNumber: 'AZI-620',
      quantity: 28,
      mfgDate: '2026-01-30',
      expiryDate: '2027-01-30',
      createdAt: '2026-08-20T13:05:00.000Z',
      updatedAt: '2026-08-20T13:05:00.000Z',
    },
    // Ascoril D Plus (One EXPIRED batch of 10 units, one FRESH batch of 20 units)
    {
      id: 'batch-9',
      medicineId: 'med-7',
      batchNumber: 'ASC-EXP01',
      quantity: 10,
      mfgDate: '2025-08-01',
      expiryDate: '2026-09-15', // Expired! Must NOT be counted in usable stock
      createdAt: '2026-08-22T14:05:00.000Z',
      updatedAt: '2026-08-22T14:05:00.000Z',
    },
    {
      id: 'batch-10',
      medicineId: 'med-7',
      batchNumber: 'ASC-FRESH02',
      quantity: 20,
      mfgDate: '2026-07-01',
      expiryDate: '2028-01-01',
      createdAt: '2026-08-22T14:06:00.000Z',
      updatedAt: '2026-08-22T14:06:00.000Z',
    },
  ];

  private stockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      medicineId: 'med-1',
      batchId: 'batch-1',
      batchNumber: 'PCM-B101',
      movementType: 'Stock Added',
      quantity: 60,
      reason: 'Initial intake',
      createdAt: '2026-08-01T08:05:00.000Z',
    },
    {
      id: 'mov-2',
      medicineId: 'med-1',
      batchId: 'batch-2',
      batchNumber: 'PCM-B102',
      movementType: 'Stock Added',
      quantity: 40,
      reason: 'Routine replenishment',
      createdAt: '2026-08-01T08:06:00.000Z',
    },
    {
      id: 'mov-3',
      medicineId: 'med-2',
      batchId: 'batch-3',
      batchNumber: 'AMX-204',
      movementType: 'Stock Added',
      quantity: 12,
      reason: 'Initial intake',
      createdAt: '2026-08-05T09:05:00.000Z',
    },
    {
      id: 'mov-4',
      medicineId: 'med-7',
      batchId: 'batch-9',
      batchNumber: 'ASC-EXP01',
      movementType: 'Stock Added',
      quantity: 10,
      reason: 'Historical stock intake',
      createdAt: '2026-08-22T14:05:00.000Z',
    },
    {
      id: 'mov-5',
      medicineId: 'med-7',
      batchId: 'batch-10',
      batchNumber: 'ASC-FRESH02',
      movementType: 'Stock Added',
      quantity: 20,
      reason: 'Fresh batch received',
      createdAt: '2026-08-22T14:06:00.000Z',
    },
  ];

  private sales: SaleRecord[] = [
    {
      id: 'sale-1',
      medicineId: 'med-1',
      medicineName: 'Paracetamol 500mg Tablets',
      quantity: 2,
      unitPrice: 15.0,
      totalAmount: 30.0,
      batchesDeducted: [
        { batchNumber: 'PCM-B101', quantity: 2, expiryDate: '2027-04-10' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'sale-2',
      medicineId: 'med-4',
      medicineName: 'Pantoprazole 40mg Tablets',
      quantity: 1,
      unitPrice: 55.0,
      totalAmount: 55.0,
      batchesDeducted: [
        { batchNumber: 'PAN-410', quantity: 1, expiryDate: '2027-02-28' },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  // --- Sales ---
  public getAllSales(): SaleRecord[] {
    return [...this.sales];
  }

  public recordSale(medicineId: string, quantity: number) {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) throw new Error('Medicine not found.');

    const allocation = this.allocateFefo(medicineId, quantity, 'Counter POS Sale');
    if (!allocation.success) throw new Error(allocation.error || 'Failed to allocate stock for sale.');

    const saleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      medicineId,
      medicineName: med.name,
      quantity,
      unitPrice: med.sellingPrice,
      totalAmount: quantity * med.sellingPrice,
      batchesDeducted: allocation.allocatedBatches.map((b) => ({
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
      })),
      createdAt: new Date().toISOString(),
    };

    this.sales.unshift(saleRecord);

    const updatedMed = this.getMedicineById(medicineId);
    return {
      sale: saleRecord,
      updatedMedicine: updatedMed!,
    };
  }

  // --- Settings ---
  public getSettings(): ShopSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<ShopSettings>): ShopSettings {
    if (newSettings.shopName !== undefined && newSettings.shopName.trim()) {
      this.settings.shopName = newSettings.shopName.trim();
    }
    if (newSettings.pharmacistName !== undefined && newSettings.pharmacistName.trim()) {
      this.settings.pharmacistName = newSettings.pharmacistName.trim();
    }
    if (newSettings.nearExpiryDays !== undefined && newSettings.nearExpiryDays > 0) {
      this.settings.nearExpiryDays = Number(newSettings.nearExpiryDays);
    }
    return { ...this.settings };
  }

  // --- Helper: Enrich medicine with batch & stock metadata ---
  private enrichMedicine(med: Medicine): MedicineWithBatches {
    const medBatches = this.batches.filter((b) => b.medicineId === med.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nearExpiryDaysThreshold = this.settings.nearExpiryDays;
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + nearExpiryDaysThreshold);

    // Physical stock
    const totalPhysicalStock = medBatches.reduce((sum, b) => sum + b.quantity, 0);

    // CRITICAL: Exclude expired batches from usable stock!
    const usableBatches = medBatches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return exp >= today && b.quantity > 0;
    });

    const expiredBatches = medBatches.filter((b) => {
      const exp = new Date(b.expiryDate);
      return exp < today && b.quantity > 0;
    });

    const usableStock = usableBatches.reduce((sum, b) => sum + b.quantity, 0);
    const expiredStock = expiredBatches.reduce((sum, b) => sum + b.quantity, 0);

    // Flags
    const isOutOfStock = usableStock === 0;
    const isLowStock = usableStock > 0 && usableStock <= med.minStockLevel;

    // Check near expiry among usable batches (within next 30 days)
    const isNearExpiry = usableBatches.some((b) => {
      const exp = new Date(b.expiryDate);
      return exp <= thresholdDate && exp >= today;
    });

    const isExpired = expiredBatches.length > 0;

    // Earliest expiry date among usable batches
    let earliestExpiry: string | null = null;
    if (usableBatches.length > 0) {
      const sorted = [...usableBatches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      earliestExpiry = sorted[0].expiryDate;
    } else if (medBatches.length > 0) {
      earliestExpiry = medBatches[0].expiryDate;
    }

    // Consolidated Stock Status
    let stockStatus: MedicineWithBatches['stockStatus'] = 'In Stock';
    if (isOutOfStock) {
      stockStatus = 'Out of Stock';
    } else if (isExpired && usableStock === 0) {
      stockStatus = 'Expired';
    } else if (isLowStock) {
      stockStatus = 'Low Stock';
    } else if (isNearExpiry) {
      stockStatus = 'Near Expiry';
    } else if (isExpired) {
      stockStatus = 'Expired';
    }

    return {
      ...med,
      batches: medBatches,
      usableStock,
      expiredStock,
      totalStock: usableStock, // Usable stock
      totalPhysicalStock,
      isLowStock,
      isNearExpiry,
      isExpired,
      isOutOfStock,
      stockStatus,
      earliestExpiry,
    };
  }

  // --- Medicines CRUD ---
  public getAllMedicines(): MedicineWithBatches[] {
    return this.medicines.map((m) => this.enrichMedicine(m));
  }

  public getMedicineById(id: string): MedicineWithBatches | null {
    const med = this.medicines.find((m) => m.id === id);
    if (!med) return null;
    return this.enrichMedicine(med);
  }

  public addMedicine(data: {
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
  }): MedicineWithBatches {
    // Validations
    if (!data.name || !data.name.trim()) throw new Error('Medicine name is required.');
    if (!data.category || !data.category.trim()) throw new Error('Category is required.');
    if (Number(data.sellingPrice) <= 0) throw new Error('Selling price must be greater than zero.');
    if (Number(data.minStockLevel) < 0) throw new Error('Minimum stock level must be non-negative.');
    if (Number(data.quantity) < 0) throw new Error('Quantity must be non-negative.');
    if (!data.batchNumber || !data.batchNumber.trim()) throw new Error('Batch number is required.');
    if (!data.expiryDate) throw new Error('Expiry date is required.');

    if (data.mfgDate && new Date(data.expiryDate) <= new Date(data.mfgDate)) {
      throw new Error('Expiry date must be later than the manufacturing date.');
    }

    const medId = `med-${Date.now()}`;
    const newMed: Medicine = {
      id: medId,
      name: data.name.trim(),
      genericName: data.genericName ? data.genericName.trim() : undefined,
      category: data.category.trim(),
      manufacturer: data.manufacturer ? data.manufacturer.trim() : undefined,
      description: data.description ? data.description.trim() : undefined,
      unit: data.unit ? data.unit.trim().toLowerCase() : 'tablets',
      minStockLevel: Math.max(0, Number(data.minStockLevel)),
      sellingPrice: Number(data.sellingPrice),
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batchId = `batch-${Date.now()}`;
    const initialBatch: MedicineBatch = {
      id: batchId,
      medicineId: medId,
      batchNumber: data.batchNumber.trim(),
      quantity: Math.max(0, Number(data.quantity)),
      mfgDate: data.mfgDate || undefined,
      expiryDate: data.expiryDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.medicines.unshift(newMed);
    this.batches.unshift(initialBatch);

    // Record Stock Movement
    if (initialBatch.quantity > 0) {
      this.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        medicineId: medId,
        batchId: batchId,
        batchNumber: initialBatch.batchNumber,
        movementType: 'Stock Added',
        quantity: initialBatch.quantity,
        reason: 'Initial stock intake',
        createdAt: new Date().toISOString(),
      });
    }

    return this.enrichMedicine(newMed);
  }

  public updateMedicine(
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
  ): MedicineWithBatches | null {
    const medIndex = this.medicines.findIndex((m) => m.id === id);
    if (medIndex === -1) return null;

    if (data.sellingPrice !== undefined && Number(data.sellingPrice) <= 0) {
      throw new Error('Selling price must be greater than zero.');
    }
    if (data.minStockLevel !== undefined && Number(data.minStockLevel) < 0) {
      throw new Error('Minimum stock level must be non-negative.');
    }

    const current = this.medicines[medIndex];
    const updated: Medicine = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      genericName: data.genericName !== undefined ? data.genericName.trim() : current.genericName,
      category: data.category !== undefined ? data.category.trim() : current.category,
      manufacturer: data.manufacturer !== undefined ? data.manufacturer.trim() : current.manufacturer,
      description: data.description !== undefined ? data.description.trim() : current.description,
      unit: data.unit !== undefined ? data.unit.trim().toLowerCase() : current.unit,
      minStockLevel: data.minStockLevel !== undefined ? Number(data.minStockLevel) : current.minStockLevel,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : current.sellingPrice,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : current.purchasePrice,
      updatedAt: new Date().toISOString(),
    };

    this.medicines[medIndex] = updated;
    return this.enrichMedicine(updated);
  }

  public deleteMedicine(id: string): boolean {
    const initialLen = this.medicines.length;
    this.medicines = this.medicines.filter((m) => m.id !== id);
    this.batches = this.batches.filter((b) => b.medicineId !== id);
    this.stockMovements = this.stockMovements.filter((mov) => mov.medicineId !== id);
    return this.medicines.length < initialLen;
  }

  // --- Batches Management ---
  public getBatches(medicineId: string): MedicineBatch[] {
    return this.batches.filter((b) => b.medicineId === medicineId);
  }

  public addBatch(
    medicineId: string,
    data: {
      batchNumber: string;
      quantity: number;
      mfgDate?: string;
      expiryDate: string;
      reason?: string;
    }
  ): MedicineBatch {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) throw new Error('Medicine not found.');

    if (!data.batchNumber || !data.batchNumber.trim()) throw new Error('Batch number is required.');
    if (Number(data.quantity) < 0) throw new Error('Batch quantity must be non-negative.');
    if (!data.expiryDate) throw new Error('Expiry date is required.');

    if (data.mfgDate && new Date(data.expiryDate) <= new Date(data.mfgDate)) {
      throw new Error('Expiry date must be later than the manufacturing date.');
    }

    // Check duplicate batch number for this medicine
    const exists = this.batches.some(
      (b) => b.medicineId === medicineId && b.batchNumber.toLowerCase() === data.batchNumber.trim().toLowerCase()
    );
    if (exists) {
      throw new Error(`Batch "${data.batchNumber}" already exists for this medicine. Update the existing batch instead.`);
    }

    const batchId = `batch-${Date.now()}`;
    const newBatch: MedicineBatch = {
      id: batchId,
      medicineId,
      batchNumber: data.batchNumber.trim(),
      quantity: Math.max(0, Number(data.quantity)),
      mfgDate: data.mfgDate || undefined,
      expiryDate: data.expiryDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.batches.unshift(newBatch);

    // Record Stock Movement
    if (newBatch.quantity > 0) {
      this.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        medicineId,
        batchId,
        batchNumber: newBatch.batchNumber,
        movementType: 'Stock Added',
        quantity: newBatch.quantity,
        reason: data.reason || 'New batch received',
        createdAt: new Date().toISOString(),
      });
    }

    return newBatch;
  }

  public updateBatch(
    medicineId: string,
    batchId: string,
    data: {
      batchNumber?: string;
      quantity?: number;
      mfgDate?: string;
      expiryDate?: string;
      reason?: string;
    }
  ): MedicineBatch | null {
    const batchIndex = this.batches.findIndex((b) => b.id === batchId && b.medicineId === medicineId);
    if (batchIndex === -1) return null;

    const current = this.batches[batchIndex];

    const newExpiry = data.expiryDate || current.expiryDate;
    const newMfg = data.mfgDate !== undefined ? data.mfgDate : current.mfgDate;
    if (newMfg && new Date(newExpiry) <= new Date(newMfg)) {
      throw new Error('Expiry date must be later than the manufacturing date.');
    }

    // Quantity delta for movement log
    const oldQty = current.quantity;
    const newQty = data.quantity !== undefined ? Math.max(0, Number(data.quantity)) : current.quantity;

    const updated: MedicineBatch = {
      ...current,
      batchNumber: data.batchNumber !== undefined ? data.batchNumber.trim() : current.batchNumber,
      quantity: newQty,
      mfgDate: newMfg,
      expiryDate: newExpiry,
      updatedAt: new Date().toISOString(),
    };

    this.batches[batchIndex] = updated;

    // If quantity changed, record Adjustment movement
    if (newQty !== oldQty) {
      const delta = newQty - oldQty;
      this.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        medicineId,
        batchId: current.id,
        batchNumber: updated.batchNumber,
        movementType: 'Adjustment',
        quantity: delta,
        reason: data.reason || `Stock count adjusted from ${oldQty} to ${newQty}`,
        createdAt: new Date().toISOString(),
      });
    }

    return updated;
  }

  // --- Stock Movement History ---
  public getStockMovements(medicineId?: string, limit = 50): (StockMovement & { medicineName: string })[] {
    let list = this.stockMovements;
    if (medicineId) {
      list = list.filter((m) => m.medicineId === medicineId);
    }
    return list.slice(0, limit).map((mov) => {
      const med = this.medicines.find((m) => m.id === mov.medicineId);
      return {
        ...mov,
        medicineName: med ? med.name : 'Unknown Medicine',
      };
    });
  }

  // --- Reusable FEFO Allocation Logic ---
  public allocateFefo(medicineId: string, requestedQuantity: number, reason = 'Dispensed / Sold'): FefoAllocationResult {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) {
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

    if (requestedQuantity <= 0) {
      return {
        success: false,
        medicineId,
        medicineName: med.name,
        requestedQuantity,
        allocatedBatches: [],
        usableStockRemaining: 0,
        error: 'Allocation quantity must be greater than zero.',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Usable active batches only: quantity > 0 and NOT expired
    const usableBatches = this.batches.filter(
      (b) => b.medicineId === medicineId && b.quantity > 0 && new Date(b.expiryDate) >= today
    );

    // Sort by earliest expiration date (FEFO)
    usableBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

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

    for (const batch of usableBatches) {
      if (remainingToDeduct <= 0) break;

      const deduct = Math.min(batch.quantity, remainingToDeduct);
      batch.quantity -= deduct;
      batch.updatedAt = new Date().toISOString();
      remainingToDeduct -= deduct;

      allocatedBatches.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: deduct,
        expiryDate: batch.expiryDate,
      });

      // Log movement for batch deduction
      this.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.random()}`,
        medicineId,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        movementType: 'Stock Removed',
        quantity: -deduct,
        reason: `${reason} (FEFO batch ${batch.batchNumber})`,
        createdAt: new Date().toISOString(),
      });
    }

    const updatedUsable = totalUsable - requestedQuantity;

    return {
      success: true,
      medicineId,
      medicineName: med.name,
      requestedQuantity,
      allocatedBatches,
      usableStockRemaining: updatedUsable,
    };
  }

  // --- Inventory Alerts Overview ---
  public getInventoryAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nearExpiryDaysThreshold = this.settings.nearExpiryDays || 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + nearExpiryDaysThreshold);

    const enriched = this.getAllMedicines();

    // 1. Low stock medicines (usable stock > 0 but <= minStockLevel)
    const lowStockMedicines = enriched.filter((m) => m.isLowStock);

    // 2. Out of stock medicines (usable stock === 0)
    const outOfStockMedicines = enriched.filter((m) => m.isOutOfStock);

    // 3. Near expiry batches (expiring within next 30 days)
    const nearExpiryBatches: {
      medicineId: string;
      medicineName: string;
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      daysRemaining: number;
      unit: string;
    }[] = [];

    // 4. Expired batches (past expiry date)
    const expiredBatches: {
      medicineId: string;
      medicineName: string;
      batchId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      daysRemaining: number;
      unit: string;
    }[] = [];

    for (const med of this.medicines) {
      const medBatches = this.batches.filter((b) => b.medicineId === med.id);
      for (const batch of medBatches) {
        if (batch.quantity > 0) {
          const exp = new Date(batch.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const diffTime = exp.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysRemaining < 0) {
            expiredBatches.push({
              medicineId: med.id,
              medicineName: med.name,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining,
              unit: med.unit,
            });
          } else if (daysRemaining <= nearExpiryDaysThreshold) {
            nearExpiryBatches.push({
              medicineId: med.id,
              medicineName: med.name,
              batchId: batch.id,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining,
              unit: med.unit,
            });
          }
        }
      }
    }

    nearExpiryBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);
    expiredBatches.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      lowStockMedicines,
      outOfStockMedicines,
      nearExpiryBatches,
      expiredBatches,
      summary: {
        totalMedicines: enriched.length,
        totalUsableUnits: enriched.reduce((sum, m) => sum + m.usableStock, 0),
        lowStockCount: lowStockMedicines.length,
        outOfStockCount: outOfStockMedicines.length,
        nearExpiryBatchCount: nearExpiryBatches.length,
        expiredBatchCount: expiredBatches.length,
      },
    };
  }
}

export const pharmacyStore = new PharmacyStore();
